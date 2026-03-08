import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { CheckCircle, Target } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

const StudyGoalsTracker = ({ data, loading, error }) => {
  const { isDark } = useTheme();
  const dailyGoal = data?.dailyGoal || 50;
  const dailyProgress = data?.dailyProgress || 0;
  const weeklyGoal = data?.weeklyGoal || 350;
  const weeklyProgress = data?.weeklyProgress || 0;

  const dailyPercentage = Math.min((dailyProgress / dailyGoal) * 100, 100);
  const weeklyPercentage = Math.min((weeklyProgress / weeklyGoal) * 100, 100);

  const getColor = (percentage) => {
    if (percentage < 50) return '#ef4444'; // red
    if (percentage < 80) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  const dailyData = [{
    name: 'Daily',
    value: dailyPercentage,
    fill: getColor(dailyPercentage)
  }];

  const weeklyData = [{
    name: 'Weekly',
    value: weeklyPercentage,
    fill: getColor(weeklyPercentage)
  }];

  const GoalCircle = ({ title, current, goal, percentage, data, isGoalMet }) => (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background={{ fill: '#1f2937' }}
            dataKey="value"
            cornerRadius={10}
            animationDuration={1000}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-2">
        {isGoalMet ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
          </motion.div>
        ) : (
          <Target className="w-5 h-5 text-gray-500 mb-1" />
        )}
        <div className="text-center max-w-full overflow-hidden">
          <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
            {current}/{goal}
          </p>
          <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>{title}</p>
        </div>
      </div>
    </div>
  );

  return (
    <ChartContainer
      title="Study Goals"
      subtitle="Track your daily and weekly targets"
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Goal Circles */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <GoalCircle
              title="Daily Goal"
              current={dailyProgress}
              goal={dailyGoal}
              percentage={dailyPercentage}
              data={dailyData}
              isGoalMet={dailyProgress >= dailyGoal}
            />
            <div className="mt-2 text-center">
              <span className={`text-sm font-semibold ${dailyPercentage >= 80 ? 'text-green-400' :
                  dailyPercentage >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                }`}>
                {dailyPercentage.toFixed(0)}%
              </span>
            </div>
          </div>

          <div>
            <GoalCircle
              title="Weekly Goal"
              current={weeklyProgress}
              goal={weeklyGoal}
              percentage={weeklyPercentage}
              data={weeklyData}
              isGoalMet={weeklyProgress >= weeklyGoal}
            />
            <div className="mt-2 text-center">
              <span className={`text-sm font-semibold ${weeklyPercentage >= 80 ? 'text-green-400' :
                  weeklyPercentage >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                }`}>
                {weeklyPercentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Celebration Message */}
        {(dailyProgress >= dailyGoal || weeklyProgress >= weeklyGoal) && (
          <motion.div
            className="bg-green-900/20 border border-green-800/30 rounded-lg p-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <p className="text-green-400 text-sm font-medium text-center">
              🎉 Great job! You've reached your {dailyProgress >= dailyGoal ? 'daily' : 'weekly'} goal!
            </p>
          </motion.div>
        )}

        {/* Progress Info */}
        <div className={`${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} rounded-lg p-3 space-y-2`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Questions remaining today:</span>
            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
              {Math.max(0, dailyGoal - dailyProgress)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Questions remaining this week:</span>
            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>
              {Math.max(0, weeklyGoal - weeklyProgress)}
            </span>
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default StudyGoalsTracker;
