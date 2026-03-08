import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lightbulb } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

const ErrorPatternAnalysis = ({ data, loading, error }) => {
  const { isDark } = useTheme();
  // Top 5 error categories
  const errorCategories = data?.categories || [];
  
  const chartData = errorCategories.slice(0, 5).map(category => ({
    category: category.name,
    errorRate: category.errorRate,
    incorrectCount: category.incorrectCount,
    totalAttempts: category.totalAttempts
  }));

  // Generate recommendations based on error patterns
  const generateRecommendations = () => {
    if (!errorCategories.length) return [];
    
    const recommendations = [];
    
    errorCategories.slice(0, 3).forEach(category => {
      if (category.errorRate > 50) {
        recommendations.push({
          category: category.name,
          suggestion: `Focus on ${category.name} - your error rate is ${category.errorRate.toFixed(0)}%. Review fundamentals and practice more questions.`
        });
      } else if (category.errorRate > 30) {
        recommendations.push({
          category: category.name,
          suggestion: `Improve ${category.name} - practice targeted questions to reduce errors from ${category.errorRate.toFixed(0)}% to below 20%.`
        });
      }
    });

    if (recommendations.length === 0) {
      recommendations.push({
        category: 'Overall',
        suggestion: 'Great job! Your error rates are low. Keep practicing to maintain consistency.'
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200 shadow-md'} border rounded-lg p-3`}>
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold mb-1`}>{data.category}</p>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
            Error Rate: <span className="text-red-400 font-medium">{data.errorRate.toFixed(1)}%</span>
          </p>
          <p className="text-gray-300 text-sm">
            Incorrect: <span className="text-white font-medium">{data.incorrectCount}/{data.totalAttempts}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title="Error Patterns"
      subtitle="Identify your weak areas"
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        {/* Error Chart */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <defs>
                <linearGradient id="errorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                type="number"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                label={{ value: 'Error Rate (%)', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Bar
                dataKey="errorRate"
                fill="url(#errorGradient)"
                radius={[0, 8, 8, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>No error data available yet. Complete more tests to see patterns.</p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm">Recommendations</span>
            </div>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-gray-300 text-xs flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{rec.suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ChartContainer>
  );
};

export default ErrorPatternAnalysis;
