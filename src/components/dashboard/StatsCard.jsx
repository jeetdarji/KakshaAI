import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * StatsCard Component
 * Displays individual performance metrics with count-up animation
 */
export default function StatsCard({ title, value, unit = '', trend, icon: Icon, loading = false }) {
  const [displayValue, setDisplayValue] = useState(0);
  const { isDark } = useTheme();

  // Count-up animation effect
  useEffect(() => {
    if (loading || typeof value !== 'number') return;

    const duration = 1000; // 1 second
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, value);
      setDisplayValue(current);

      if (step >= steps || current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, loading]);

  // Skeleton loader
  if (loading) {
    return (
      <div className={`border rounded-xl p-6 animate-pulse ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`h-4 rounded w-24 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className={`h-8 w-8 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        </div>
        <div className={`h-8 rounded w-32 mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-3 rounded w-16 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
    );
  }

  // Format display value
  const formattedValue = typeof value === 'number' 
    ? Math.round(displayValue)
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`border rounded-xl p-6 hover:border-teal-500/50 transition-all duration-300 ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</h3>
        {Icon && (
          <div className="p-2 bg-teal-500/10 rounded-lg">
            <Icon className="w-5 h-5 text-teal-500" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <motion.span
          key={formattedValue}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {formattedValue}
        </motion.span>
        {unit && (
          <span className="text-lg text-gray-500">{unit}</span>
        )}
      </div>

      {/* Trend Indicator */}
      {trend !== undefined && trend !== null && (
        <div className="flex items-center gap-1">
          {trend > 0 ? (
            <>
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-sm text-green-500 font-medium">
                +{Math.abs(trend).toFixed(1)}%
              </span>
            </>
          ) : trend < 0 ? (
            <>
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm text-red-500 font-medium">
                {trend.toFixed(1)}%
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-500 font-medium">
              No change
            </span>
          )}
          <span className="text-xs text-gray-600 ml-1">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
