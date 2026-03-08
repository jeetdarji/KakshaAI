import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * WeeklyActivityChart — shows questions attempted & accuracy over past 7 days
 * Tooltip includes exam type breakdown (Mock Test / Chapter Quiz)
 */
export default function WeeklyActivityChart({ data, loading = false, timeRange = '7d' }) {
  const { isDark } = useTheme();

  const timeRangeLabels = {
    '7d': { title: 'Last 7 Days Activity', subtitle: 'Questions attempted and accuracy over the past 7 days' },
    '30d': { title: 'Last 30 Days Activity', subtitle: 'Questions attempted and accuracy over the past 30 days' },
    '90d': { title: 'Last 90 Days Activity', subtitle: 'Questions attempted and accuracy over the past 3 months' },
    '1y': { title: 'Last Year Activity', subtitle: 'Questions attempted and accuracy over the past year' },
  };
  const { title: chartTitle, subtitle: chartSubtitle } = timeRangeLabels[timeRange] || timeRangeLabels['30d'];
  const showDots = (timeRange === '7d' || timeRange === '30d');
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const chartData = payload[0]?.payload;
      return (
        <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3 min-w-[200px]`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-2`}>{label}</p>
          <p className="text-blue-400 text-sm">
            Questions: {chartData?.questionsAttempted || 0}
          </p>
          <p className="text-green-400 text-sm">
            Accuracy: {chartData?.accuracy || 0}%
          </p>

          {/* Exam type breakdown */}
          {(chartData?.mockTests > 0 || chartData?.quizzes > 0) && (
            <div className="border-t border-gray-700 mt-2 pt-2 space-y-1">
              {chartData?.mockTests > 0 && (
                <p className="text-purple-400 text-xs font-medium">
                  🎯 Mock Tests: {chartData.mockTests}
                </p>
              )}
              {chartData?.quizzes > 0 && (
                <p className="text-cyan-400 text-xs font-medium">
                  📝 Chapter Quizzes: {chartData.quizzes}
                </p>
              )}
              {chartData?.examDetails?.map((exam, i) => (
                <p key={i} className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs pl-2`}>
                  • {exam.type}
                  {exam.chapter ? ` (${exam.chapter})` : ''}
                  : {exam.correct}/{exam.questions} correct
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title={chartTitle}
      subtitle={chartSubtitle}
      loading={loading}
    >
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="dayName"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              interval={timeRange === '1y' ? 29 : timeRange === '90d' ? 6 : 'preserveStartEnd'}
              angle={timeRange !== '7d' ? -45 : 0}
              textAnchor={timeRange !== '7d' ? 'end' : 'middle'}
              height={timeRange !== '7d' ? 50 : 30}
            />
            <YAxis
              yAxisId="left"
              stroke="#3b82f6"
              style={{ fontSize: '12px' }}
              label={{ value: 'Questions', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
              label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (
                <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>{value}</span>
              )}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="questionsAttempted"
              fill="url(#colorQuestions)"
              stroke="#3b82f6"
              strokeWidth={0}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="questionsAttempted"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={showDots ? { fill: '#3b82f6', r: 4 } : false}
              activeDot={{ r: 6 }}
              name="Questions"
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              fill="url(#colorAccuracy)"
              stroke="#10b981"
              strokeWidth={0}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              stroke="#10b981"
              strokeWidth={2}
              dot={showDots ? { fill: '#10b981', r: 4 } : false}
              activeDot={{ r: 6 }}
              name="Accuracy"
              animationDuration={800}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>No weekly activity data available</p>
        </div>
      )}
    </ChartContainer>
  );
}
