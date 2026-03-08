import { motion } from 'framer-motion';
import SkeletonLoader from './SkeletonLoader';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ChartContainer - Wrapper component for all analytics charts
 * Provides consistent styling, loading states, and error handling
 */
export default function ChartContainer({ 
  title, 
  subtitle, 
  children, 
  loading = false, 
  error = null,
  className = '' 
}) {
  const { isDark } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`${isDark ? 'bg-[#1a1a1a] border-gray-800/50 shadow-black/20' : 'bg-white border-gray-200 shadow-gray-200/50'} rounded-xl p-6 border shadow-lg h-full ${className}`}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        {subtitle && (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        {loading ? (
          <SkeletonLoader type="chart" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}
