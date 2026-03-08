import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import SkeletonLoader from './SkeletonLoader';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * KPICard - Key Performance Indicator card with animated counter
 * Displays a single metric with icon, title, value, and optional trend
 */
export default function KPICard({ 
  title, 
  value, 
  unit = '', 
  icon: Icon, 
  trend = null, 
  loading = false 
}) {
  if (loading) {
    return <SkeletonLoader type="card" />;
  }

  const { isDark } = useTheme();

  const trendColor = trend && trend > 0 ? 'text-green-400' : trend && trend < 0 ? 'text-red-400' : 'text-gray-400';
  const trendIcon = trend && trend > 0 ? '↑' : trend && trend < 0 ? '↓' : '';

  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 20px 25px -5px rgba(20, 184, 166, 0.1)'
      }}
      transition={{ duration: 0.2 }}
      className={`${isDark ? 'bg-[#1a1a1a] border-gray-800/50 shadow-black/20' : 'bg-white border-gray-200 shadow-gray-200/50'} rounded-xl p-6 border shadow-lg hover:border-teal-500/30 transition-colors`}
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-lg">
          {Icon && <Icon className="w-6 h-6 text-teal-400" />}
        </div>
        {trend !== null && (
          <div className={`flex items-center text-sm font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <AnimatedCounter value={value} decimals={unit === '%' ? 1 : 0} suffix={unit} />
        </div>
      </div>

      {/* Title */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {title}
      </div>
    </motion.div>
  );
}
