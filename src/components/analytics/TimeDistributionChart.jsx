import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * TimeDistributionChart - Donut chart showing study time allocation across subjects
 * Displays time spent on Physics, Chemistry, and Mathematics
 */
export default function TimeDistributionChart({ data, loading = false }) {
  const { isDark } = useTheme();
  // Format time helper
  const formatTime = (hours, minutes) => {
    if (hours === 0 && minutes === 0) return '0m';
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Calculate total time
  const totalHours = data?.reduce((sum, d) => sum + d.hours, 0) || 0;
  const totalMinutes = data?.reduce((sum, d) => sum + d.minutes, 0) || 0;
  const totalTime = formatTime(totalHours + Math.floor(totalMinutes / 60), totalMinutes % 60);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-1`}>{data.subject}</p>
          <p className="text-teal-400 text-sm">
            Time: {formatTime(data.hours, data.minutes)}
          </p>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs mt-1`}>
            {data.percentage}% of total time
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for center
  const renderCenterLabel = () => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white"
      >
        <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="bold">
          {totalTime}
        </tspan>
        <tspan x="50%" dy="1.5em" fontSize="14" className="fill-gray-400">
          Total Study Time
        </tspan>
      </text>
    );
  };

  return (
    <ChartContainer 
      title="Time Distribution" 
      subtitle="Study time allocation across subjects"
      loading={loading}
    >
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="percentage"
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => (
                <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                  {entry.payload.subject}: {formatTime(entry.payload.hours, entry.payload.minutes)}
                </span>
              )}
            />
            {renderCenterLabel()}
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>No study time data available</p>
        </div>
      )}
    </ChartContainer>
  );
}
