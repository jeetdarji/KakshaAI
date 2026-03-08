import { RadialBarChart, RadialBar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * SubjectPerformanceChart - Circular/radial chart showing performance across subjects
 * Displays Physics, Chemistry, and Mathematics performance with distinct colors
 */
export default function SubjectPerformanceChart({ data, loading = false }) {
  const { isDark } = useTheme();
  // Transform data for RadialBarChart
  const chartData = data?.map((subject, index) => ({
    name: subject.subject,
    value: subject.percentage,
    fill: subject.color,
    totalQuestions: subject.totalQuestions,
    correctAnswers: subject.correctAnswers
  })) || [];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-1`}>{data.name}</p>
          <p className="text-teal-400 text-sm">Accuracy: {data.value}%</p>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs mt-1`}>
            {data.correctAnswers}/{data.totalQuestions} questions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="Subject Performance"
      subtitle="Overall accuracy across all subjects"
      loading={loading}
    >
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="90%"
            data={chartData}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              minAngle={15}
              background
              clockWise
              dataKey="value"
              cornerRadius={10}
              animationDuration={1200}
              animationBegin={200}
              animationEasing="ease-out"
              isAnimationActive={true}
            />
            <Legend
              iconSize={10}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value, entry) => (
                <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                  {value}: {entry.payload.value}%
                </span>
              )}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>No subject performance data available</p>
        </div>
      )}
    </ChartContainer>
  );
}
