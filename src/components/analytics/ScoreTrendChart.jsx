import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ScoreTrendChart — single thick line showing mock test score out of 200
 * Shows score progression over time with aesthetic gradient fill
 */
export default function ScoreTrendChart({ data, loading = false }) {
  const [timeRange, setTimeRange] = useState('30d');
  const { isDark } = useTheme();

  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return data.filter(d => new Date(d.date) >= cutoff);
  };

  const filteredData = getFilteredData();

  // Calculate average score for reference line
  const avgScore = filteredData.length > 0
    ? Math.round(filteredData.reduce((sum, d) => sum + d.score, 0) / filteredData.length)
    : 0;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload;
      return (
        <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-xl p-4 min-w-[180px]`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs mb-1`}>{formatDate(label)}</p>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-lg mb-1`}>
            {entry?.score || 0}
            <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm font-normal`}> / 200</span>
          </p>
          {entry?.testName && (
            <p className="text-teal-400 text-xs">{entry.testName}</p>
          )}
          {entry?.rawScore !== undefined && entry?.maxScore && (
            <p className="text-gray-500 text-xs mt-1">
              Raw: {entry.rawScore} / {entry.maxScore}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom dot for data points
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    const isHigh = payload.score >= 140;
    const isLow = payload.score < 80;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={isHigh ? '#10b981' : isLow ? '#ef4444' : '#14b8a6'}
        stroke="#1a1a1a"
        strokeWidth={2}
      />
    );
  };

  return (
    <ChartContainer
      title="Score Trends"
      subtitle="Mock test scores out of 200 over time"
      loading={loading}
    >
      {/* Time Range Selector */}
      <div className="flex gap-2 mb-4">
        {['7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeRange === range
                ? 'bg-teal-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="50%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              domain={[0, 200]}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#9ca3af' }}
              ticks={[0, 40, 80, 120, 160, 200]}
              label={{
                value: 'Score / 200',
                angle: -90,
                position: 'insideLeft',
                fill: '#9ca3af',
                style: { fontSize: '12px' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Average score reference line */}
            {avgScore > 0 && (
              <ReferenceLine
                y={avgScore}
                stroke="#6b7280"
                strokeDasharray="6 4"
                label={{
                  value: `Avg: ${avgScore}`,
                  position: 'right',
                  fill: '#9ca3af',
                  fontSize: 11
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="score"
              stroke="url(#strokeGradient)"
              strokeWidth={3.5}
              fill="url(#scoreGradient)"
              dot={<CustomDot />}
              activeDot={{
                r: 7,
                fill: '#14b8a6',
                stroke: '#0f766e',
                strokeWidth: 2
              }}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>No mock test score data available</p>
        </div>
      )}

      {/* Summary stats below chart */}
      {filteredData.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className={`${isDark ? 'bg-gray-900/50 border-gray-800/50' : 'bg-gray-50 border-gray-200'} rounded-lg p-3 text-center border`}>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Highest</p>
            <p className="text-green-400 font-bold text-lg">
              {Math.max(...filteredData.map(d => d.score))}
            </p>
          </div>
          <div className={`${isDark ? 'bg-gray-900/50 border-gray-800/50' : 'bg-gray-50 border-gray-200'} rounded-lg p-3 text-center border`}>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Average</p>
            <p className="text-teal-400 font-bold text-lg">{avgScore}</p>
          </div>
          <div className={`${isDark ? 'bg-gray-900/50 border-gray-800/50' : 'bg-gray-50 border-gray-200'} rounded-lg p-3 text-center border`}>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Latest</p>
            <p className="text-cyan-400 font-bold text-lg">
              {filteredData[filteredData.length - 1]?.score || 0}
            </p>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
