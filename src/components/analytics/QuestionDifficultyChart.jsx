import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts';
import { motion } from 'framer-motion';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * QuestionDifficultyChart — multi-dimensional radar showing performance profile
 * Axes: Physics, Chemistry, Mathematics, Speed, Completion, Consistency
 */
const QuestionDifficultyChart = ({ data, loading, error }) => {
  const { isDark } = useTheme();
  const radarData = data?.radarData || [];
  const subjects = data?.subjects || [];

  // Color mapping for subject stats
  const subjectColors = {
    Physics: '#3b82f6',
    Chemistry: '#10b981',
    Mathematics: '#f97316'
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      return (
        <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-sm`}>{item?.metric}</p>
          <p className="text-teal-400 text-sm font-medium">
            {item?.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Get overall score for performance badge
  const overallScore = radarData.length > 0
    ? Math.round(radarData.reduce((sum, d) => sum + d.value, 0) / radarData.length)
    : 0;

  const getPerformanceLabel = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/40' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/40' };
    if (score >= 40) return { label: 'Average', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/40' };
    return { label: 'Needs Work', color: 'text-red-400', bg: 'bg-red-900/30 border-red-800/40' };
  };

  const perfInfo = getPerformanceLabel(overallScore);

  return (
    <ChartContainer
      title="Performance Profile"
      loading={loading}
      error={error}
    >
      {/* Explanation line */}
      <p className="text-gray-400 text-xs mb-4">
        Radar analysis of your mock test performance across accuracy, speed, consistency, and completion rate
      </p>

      {radarData.length > 0 ? (
        <div className="space-y-4">
          {/* Performance badge */}
          <div className="flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`px-4 py-1.5 rounded-full border ${perfInfo.bg}`}
            >
              <span className={`text-sm font-semibold ${perfInfo.color}`}>
                {perfInfo.label} — {overallScore}%
              </span>
            </motion.div>
          </div>

          {/* Radar Chart */}
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#374151" strokeOpacity={0.5} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fill: '#d1d5db',
                  fontSize: 11,
                  fontWeight: 500
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 9 }}
                tickCount={5}
                stroke="#374151"
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="#14b8a6"
                strokeWidth={2.5}
                fill="#14b8a6"
                fillOpacity={0.2}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Subject stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {subjects.map((subj) => (
              <motion.div
                key={subj.subject}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`${isDark ? 'bg-gray-900/60 border-gray-800/50' : 'bg-gray-50 border-gray-200'} rounded-lg p-2.5 border text-center`}
              >
                <div
                  className="w-2 h-2 rounded-full mx-auto mb-1.5"
                  style={{ backgroundColor: subjectColors[subj.subject] || '#6b7280' }}
                />
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-[10px] uppercase tracking-wider`}>
                  {subj.subject}
                </p>
                <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-lg leading-tight`}>
                  {subj.accuracy}%
                </p>
                <p className="text-gray-500 text-[10px]">
                  {subj.correct}/{subj.attempted} correct
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>Complete mock tests to see your performance profile</p>
        </div>
      )}
    </ChartContainer>
  );
};

export default QuestionDifficultyChart;
