import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatStudyTime, getHeatmapData } from '../../lib/dashboard';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * StudyStreakHeatmap Component
 * GitHub-style contribution graph showing a full calendar year (Jan–Dec)
 * with proper month spacing and year selector
 */
export default function StudyStreakHeatmap({ activityData: initialData = [], loading = false, userId = null }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activityData, setActivityData] = useState(initialData);
  const [yearLoading, setYearLoading] = useState(false);
  const { isDark } = useTheme();

  // Available years (last 3 years)
  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear - 2; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Auto-refresh data every 30 seconds to show real-time updates
  useEffect(() => {
    if (!userId || selectedYear !== currentYear) return;

    const refreshInterval = setInterval(async () => {
      try {
        const data = await getHeatmapData(userId);
        setActivityData(data);
      } catch (err) {
        console.error('Error refreshing heatmap:', err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [userId, selectedYear, currentYear]);

  // Sync initial data
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setActivityData(initialData);
    }
  }, [initialData]);

  // Fetch data when year changes
  useEffect(() => {
    if (selectedYear !== currentYear && userId) {
      const fetchData = async () => {
        setYearLoading(true);
        try {
          const data = await getHeatmapData(userId, selectedYear);
          setActivityData(data);
        } catch (err) {
          console.error('Error fetching heatmap data:', err);
        } finally {
          setYearLoading(false);
        }
      };
      fetchData();
    } else if (selectedYear === currentYear && initialData.length > 0) {
      setActivityData(initialData);
    }
  }, [selectedYear, userId, currentYear]);

  const isLoading = loading || yearLoading;

  // Build activity map from data
  const activityMap = useMemo(() => {
    const map = {};
    if (activityData) {
      activityData.forEach(a => { map[a.date] = a; });
    }
    return map;
  }, [activityData]);

  // Generate the FULL calendar year (Jan 1 – Dec 31) regardless of current date
  // This is the key difference: future dates are shown as empty cells
  const monthData = useMemo(() => {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(selectedYear, month, 1);
      const lastDay = new Date(selectedYear, month + 1, 0);
      const daysInMonth = lastDay.getDate();

      // Build weeks for this month
      const weeks = [];
      let currentWeek = [];

      // Pad first week (Sunday = 0, Monday = 1, etc.)
      const startDow = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

      for (let i = 0; i < startDow; i++) {
        currentWeek.push(null);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, month, day);
        const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isFuture = date > today;
        const activity = activityMap[dateStr];

        currentWeek.push({
          date: dateStr,
          intensity: isFuture ? 'future' : (activity?.intensity || 'none'),
          videosWatched: activity?.videosWatched || 0,
          testsTaken: activity?.testsTaken || 0,
          questionsAnswered: activity?.questionsAnswered || 0,
          chaptersCompleted: activity?.chaptersCompleted || 0,
          downloadsCount: activity?.downloadsCount || 0,
          studyTime: activity?.studyTime || 0,
          isFuture
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // Pad last week
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push(currentWeek);
      }

      months.push({
        name: monthNames[month],
        weeks
      });
    }

    return months;
  }, [selectedYear, activityMap]);

  // Intensity color with better visibility and glow effect
  const getColor = useCallback((intensity) => {
    if (isDark) {
      switch (intensity) {
        case 'light': return 'bg-emerald-500/40 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
        case 'medium': return 'bg-emerald-500/70 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
        case 'high': return 'bg-emerald-400 border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]';
        case 'future': return 'bg-gray-800/30 border border-gray-700/30';
        default: return 'bg-gray-800/50 border border-gray-700/40';
      }
    } else {
      switch (intensity) {
        case 'light': return 'bg-emerald-200 border border-emerald-300';
        case 'medium': return 'bg-emerald-400 border border-emerald-500';
        case 'high': return 'bg-emerald-600 border border-emerald-700';
        case 'future': return 'bg-gray-100 border border-gray-200';
        default: return 'bg-gray-100 border border-gray-200';
      }
    }
  }, [isDark]);

  // === ALL HOOKS ABOVE ===

  if (isLoading) {
    return (
      <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <div className={`h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-6 animate-pulse`}></div>
        <div className={`h-40 ${isDark ? 'bg-gray-700/30' : 'bg-gray-100'} rounded animate-pulse`}></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-2xl`}>Study Streak</h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={`${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'} text-base rounded-lg px-4 py-2 border 
                       hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none
                       transition-colors duration-200 cursor-pointer font-medium`}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span>Less</span>
          <div className="flex gap-1.5">
            <div className={`w-4 h-4 ${isDark ? 'bg-gray-800/50 border-gray-700/40' : 'bg-gray-100 border-gray-200'} border rounded-sm`}></div>
            <div className="w-4 h-4 bg-emerald-500/40 border border-emerald-500/30 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-500/70 border border-emerald-500/50 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-400 border border-emerald-300 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Day Labels + Month Grid */}
      <div className="flex gap-3">
        {/* Day of week labels */}
        <div className="flex flex-col gap-[3px] pr-3 pt-8 shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
            <div key={i} className={`h-[16px] text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} leading-[16px] font-medium`}>
              {label}
            </div>
          ))}
        </div>

        {/* Months */}
        <div className="flex gap-3 overflow-x-auto pb-3 flex-1">
          {monthData.map((month, monthIdx) => (
            <div key={monthIdx} className="flex flex-col shrink-0">
              {/* Month label */}
              <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2 h-6 leading-6 font-semibold`}>
                {month.name}
              </div>

              {/* Weeks as columns */}
              <div className="flex gap-[3px]">
                {month.weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        return <div key={dayIdx} className="w-[16px] h-[16px]" />;
                      }

                      return (
                        <motion.div
                          key={dayIdx}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.1, delay: Math.min(monthIdx * 0.03 + weekIdx * 0.005, 0.4) }}
                          className={`
                            w-[16px] h-[16px] rounded-[3px] cursor-pointer
                            ${getColor(day.intensity)}
                            ${!day.isFuture ? `hover:ring-2 hover:ring-emerald-400 hover:ring-offset-2 ${isDark ? 'hover:ring-offset-[#1a1a1a]' : 'hover:ring-offset-white'} hover:scale-110` : ''}
                            transition-all duration-200
                          `}
                          onMouseEnter={() => !day.isFuture && setHoveredCell(day)}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      <div className="relative h-[70px] mt-3">
        {hoveredCell && !hoveredCell.isFuture && (
          <div
            className={`absolute top-0 left-0 p-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-md'} rounded-lg border pointer-events-none`}
          >
            <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'} font-medium mb-1`}>
              {new Date(hoveredCell.date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} space-y-0.5`}>
              {hoveredCell.videosWatched > 0 && (
                <div>📹 {hoveredCell.videosWatched} video{hoveredCell.videosWatched > 1 ? 's' : ''}</div>
              )}
              {hoveredCell.testsTaken > 0 && (
                <div>📝 {hoveredCell.testsTaken} test{hoveredCell.testsTaken > 1 ? 's' : ''}</div>
              )}
              {hoveredCell.questionsAnswered > 0 && (
                <div>❓ {hoveredCell.questionsAnswered} questions</div>
              )}
              {hoveredCell.chaptersCompleted > 0 && (
                <div>✅ {hoveredCell.chaptersCompleted} chapter{hoveredCell.chaptersCompleted > 1 ? 's' : ''}</div>
              )}
              {hoveredCell.downloadsCount > 0 && (
                <div>📥 {hoveredCell.downloadsCount} download{hoveredCell.downloadsCount > 1 ? 's' : ''}</div>
              )}
              {hoveredCell.studyTime > 0 && (
                <div>⏱️ {formatStudyTime(hoveredCell.studyTime)}</div>
              )}
              {hoveredCell.intensity === 'none' && (
                <div className="text-gray-500">No activity</div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
