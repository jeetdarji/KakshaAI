import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

const TimeManagementMetrics = ({ data, loading, error }) => {
  const { isDark } = useTheme();
  const RECOMMENDED_TIME = 90; // seconds per question for MHT-CET

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const subjects = [
    { name: 'Physics', avgTime: data?.physics || 0, color: '#3b82f6' },
    { name: 'Chemistry', avgTime: data?.chemistry || 0, color: '#10b981' },
    { name: 'Mathematics', avgTime: data?.mathematics || 0, color: '#f97316' }
  ];

  const overallAvg = data?.overall || 0;
  const isWithinTarget = overallAvg <= RECOMMENDED_TIME;

  return (
    <ChartContainer
      title="Time Management"
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Overall Average */}
        <div className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Average Time/Question</span>
            </div>
            {isWithinTarget ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatTime(overallAvg)}
            </span>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              / {formatTime(RECOMMENDED_TIME)} target
            </span>
          </div>
          {!isWithinTarget && (
            <p className="text-xs text-red-400 mt-2">
              ⚠️ You're taking longer than recommended. Try to improve your speed.
            </p>
          )}
        </div>

        {/* Subject-wise Breakdown */}
        <div className="grid grid-cols-1 gap-3">
          {subjects.map((subject) => {
            const exceedsTarget = subject.avgTime > RECOMMENDED_TIME;
            return (
              <div
                key={subject.name}
                className={`${isDark ? 'bg-gray-900/30 border-gray-800' : 'bg-gray-50 border-gray-200'} rounded-lg p-3 border`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${exceedsTarget ? 'text-red-400' : 'text-green-400'}`}>
                      {formatTime(subject.avgTime)}
                    </span>
                    {exceedsTarget && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendation */}
        <div className="bg-teal-900/20 border border-teal-800/30 rounded-lg p-3">
          <p className="text-xs text-teal-300">
            💡 MHT-CET allows 90 seconds per question. Practice with time limits to improve your speed.
          </p>
        </div>
      </div>
    </ChartContainer>
  );
};

export default TimeManagementMetrics;
