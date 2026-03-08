import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

const ComparativePerformanceChart = ({ data, loading, error }) => {
  const { isDark } = useTheme();
  const userPercentile = data?.userPercentile || 0;
  const totalUsers = data?.totalUsers || 0;

  // Generate bell curve data
  const generateBellCurve = () => {
    const points = [];
    for (let x = 0; x <= 100; x += 2) {
      // Normal distribution formula (approximation)
      const mean = 50;
      const stdDev = 15;
      const y = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
      points.push({ percentile: x, density: y * 100 });
    }
    return points;
  };

  const bellCurveData = generateBellCurve();

  const benchmarks = [
    { value: 50, label: 'Platform Average', color: '#6b7280' },
    { value: 75, label: 'Top 25%', color: '#f59e0b' },
    { value: 90, label: 'Top 10%', color: '#10b981' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>
            Percentile: <span className="font-semibold">{payload[0].payload.percentile}th</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="Comparative Performance"
      subtitle="Your position among all students"
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        {/* Bell Curve Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart
            data={bellCurveData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="bellCurveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="percentile"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              label={{ value: 'Percentile', position: 'insideBottom', offset: -10, fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              label={{ value: 'Student Density', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="density"
              stroke="#14b8a6"
              fill="url(#bellCurveGradient)"
              animationDuration={1000}
            />

            {/* Benchmark Lines */}
            {benchmarks.map((benchmark) => (
              <ReferenceLine
                key={benchmark.value}
                x={benchmark.value}
                stroke={benchmark.color}
                strokeDasharray="3 3"
                strokeWidth={2}
              />
            ))}

            {/* User Position Line */}
            <ReferenceLine
              x={userPercentile}
              stroke="#3b82f6"
              strokeWidth={3}
              label={{
                value: 'You',
                position: 'top',
                fill: '#3b82f6',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* User Position Card */}
        <motion.div
          className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Your Percentile</span>
            <span className="text-blue-400 text-2xl font-bold">{userPercentile}th</span>
          </div>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs mt-2`}>
            You're performing better than {userPercentile}% of all {totalUsers} students on the platform
          </p>
        </motion.div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {benchmarks.map((benchmark) => (
            <div key={benchmark.value} className="flex items-center gap-2">
              <div
                className="w-3 h-0.5"
                style={{ backgroundColor: benchmark.color }}
              />
              <span className="text-gray-400 text-xs">{benchmark.label}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartContainer>
  );
};

export default ComparativePerformanceChart;
