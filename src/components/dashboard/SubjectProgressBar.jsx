import { motion } from 'framer-motion';
import { getSubjectColor, getSubjectIcon } from '../../lib/subjectProgressService';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * SubjectProgressBar Component
 * Shows completion progress for a subject with animated progress bar
 */
export default function SubjectProgressBar({ 
  subject, 
  percentage, 
  completedChapters, 
  totalChapters, 
  loading = false 
}) {
  const { isDark } = useTheme();

  // Skeleton loader
  if (loading) {
    return (
      <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6 animate-pulse`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-24`}></div>
          <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-16`}></div>
        </div>
        <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mb-3`}></div>
        <div className={`h-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-20`}></div>
      </div>
    );
  }

  // Get subject-specific styling
  const colorClass = getSubjectColor(subject);
  const icon = getSubjectIcon(subject);

  // Color mappings for progress bar
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10',
      bar: 'bg-blue-500',
      text: 'text-blue-500',
      glow: 'shadow-blue-500/50'
    },
    green: {
      bg: 'bg-green-500/10',
      bar: 'bg-green-500',
      text: 'text-green-500',
      glow: 'shadow-green-500/50'
    },
    purple: {
      bg: 'bg-purple-500/10',
      bar: 'bg-purple-500',
      text: 'text-purple-500',
      glow: 'shadow-purple-500/50'
    }
  };

  const colors = colorMap[colorClass] || colorMap.blue;

  // Empty state message
  const isEmpty = percentage === 0 && completedChapters === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6 hover:border-teal-500/30 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>{subject}</h3>
        </div>
        <span className={`text-2xl font-bold ${colors.text}`}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className={`h-2 ${colors.bg} rounded-full overflow-hidden mb-3`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className={`h-full ${colors.bar} rounded-full ${colors.glow} shadow-lg`}
        />
      </div>

      {/* Chapter Count */}
      {isEmpty ? (
        <p className="text-sm text-gray-500">
          Start your {subject} journey today! 🚀
        </p>
      ) : (
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{completedChapters}</span>
          {' '}of{' '}
          <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{totalChapters}</span>
          {' '}chapters completed
        </p>
      )}

      {/* Completion Badge */}
      {percentage === 100 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 1.2 }}
          className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-medium"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Completed!
        </motion.div>
      )}
    </motion.div>
  );
}
