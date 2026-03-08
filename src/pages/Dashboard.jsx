import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getDashboardData, getHeatmapData, formatStudyTime } from '../lib/dashboard';
import activityTracker from '../lib/activityTracker';
import { useTheme } from '../contexts/ThemeContext';

// Import dashboard components
import StatsCard from '../components/dashboard/StatsCard';
import SubjectProgressBar from '../components/dashboard/SubjectProgressBar';
import QuickActions from '../components/dashboard/QuickActions';
import RecentTests from '../components/dashboard/RecentTests';
import DailyChallenge from '../components/dashboard/DailyChallenge';
import StudyStreakHeatmap from '../components/dashboard/StudyStreakHeatmap';
import RewardsAndBadges from '../components/dashboard/RewardsAndBadges';

// Import icons
import { Target, CheckCircle, Flame, Clock } from 'lucide-react';

/**
 * Dashboard Page Component
 * Main student dashboard with real-time analytics and progress tracking
 */
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const { isDark } = useTheme();
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    subjectProgress: [],
    recentTests: [],
    dailyChallenge: null,
    activityData: [],
    loading: true,
    error: null
  });
  const [heatmapData, setHeatmapData] = useState([]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Initialize activity tracker
  useEffect(() => {
    if (user) {
      activityTracker.initialize(user.id);
    }

    return () => {
      if (user) {
        activityTracker.cleanup();
      }
    };
  }, [user]);

  // Fetch dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      // Fetch all dashboard data
      const data = await getDashboardData(user.id);
      const heatmap = await getHeatmapData(user.id);

      // Calculate current streak from heatmap data
      const currentStreak = calculateCurrentStreakFromActivity(heatmap);
      
      // Update stats with calculated streak
      if (data.stats) {
        data.stats.current_streak_days = currentStreak;
      }

      setDashboardData(data);
      setHeatmapData(heatmap);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  // Calculate current streak from activity data
  const calculateCurrentStreakFromActivity = (activityData) => {
    if (!activityData || activityData.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);

    // Count backwards from today
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = activityData.find(a => a.date === dateStr);
      
      if (activity && activity.intensity !== 'none' && activity.intensity !== 'future') {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Get user's first name
  const getFirstName = () => {
    if (!user) return 'Student';

    // Try to get from user metadata
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }

    // Fallback to email username
    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'Student';
  };

  const { stats, subjectProgress, recentTests, dailyChallenge, loading, error } = dashboardData;

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 pt-32">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
          <h2 className="text-red-500 font-semibold text-lg mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 pt-32">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Welcome back, {getFirstName()}! 👋
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ready to crush your targets today?</p>
          </div>
          <div className={`rounded-xl px-4 py-2 flex items-center gap-3 border ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Exam Date: May 12, 2026</span>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Avg. Mock Score"
            value={stats?.avg_mock_score || 0}
            unit="/200"
            trend={stats?.avgMockScoreTrend}
            icon={Target}
            loading={loading}
          />
          <StatsCard
            title="Accuracy Rate"
            value={stats?.accuracy_rate || 0}
            unit="%"
            icon={CheckCircle}
            loading={loading}
          />
          <StatsCard
            title="Current Streak"
            value={stats?.current_streak_days || 0}
            unit=" Days"
            icon={Flame}
            loading={loading}
          />
          <StatsCard
            title="Study Time"
            value={formatStudyTime(stats?.total_study_time_seconds || 0)}
            icon={Clock}
            loading={loading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Subject Progress & Recent Tests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subject Progress */}
            <div>
              <h2 className={`font-semibold text-xl mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Subject Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjectProgress.map((subject) => (
                  <SubjectProgressBar
                    key={subject.subject}
                    subject={subject.subject}
                    percentage={subject.percentage}
                    completedChapters={subject.completedChapters}
                    totalChapters={subject.totalChapters}
                    loading={loading}
                  />
                ))}
              </div>
            </div>

            {/* Recent Tests */}
            <RecentTests tests={recentTests} loading={loading} />
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <div>
              <h2 className={`font-semibold text-xl mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h2>
              <QuickActions />
            </div>
          </div>
        </div>

        {/* Daily Challenge - Full Width */}
        <DailyChallenge challenge={dailyChallenge} loading={loading} />

        {/* Rewards & Badges - Horizontal Section */}
        <RewardsAndBadges 
          stats={stats} 
          activityData={heatmapData} 
          loading={loading} 
        />

        {/* Study Streak Heatmap */}
        <StudyStreakHeatmap activityData={heatmapData} loading={loading} userId={user?.id} />
      </motion.div>
    </div>
  );
}
