import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

const AccuracyDistributionChart = ({ data, loading, error }) => {
  const { isDark } = useTheme();
  // Define bins for histogram
  const bins = [
    { range: '0-20%', min: 0, max: 20, color: '#ef4444' },
    { range: '20-40%', min: 20, max: 40, color: '#f97316' },
    { range: '40-60%', min: 40, max: 60, color: '#f59e0b' },
    { range: '60-80%', min: 60, max: 80, color: '#84cc16' },
    { range: '80-100%', min: 80, max: 100, color: '#10b981' }
  ];

  // Group test scores into bins
  const chartData = bins.map(bin => {
    const count = data?.filter(score =>
      score >= bin.min && score < (bin.max === 100 ? 101 : bin.max)
    ).length || 0;

    return {
      range: bin.range,
      count,
      color: bin.color
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-1`}>{data.range}</p>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
            Tests: <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="Score Distribution"
      subtitle="Distribution of test scores"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="range"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: 'Accuracy Range', position: 'insideBottom', offset: -10, fill: '#9ca3af' }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            label={{ value: 'Number of Tests', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
            animationDuration={800}
            animationBegin={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default AccuracyDistributionChart;
