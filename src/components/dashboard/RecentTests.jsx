import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatRelativeDate } from '../../lib/dashboard';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * RecentTests Component
 * Displays list of recent test attempts with scores
 */
export default function RecentTests({ tests = [], loading = false }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Skeleton loader
  if (loading) {
    return (
      <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <div className={`h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-6 animate-pulse`}></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex items-center justify-between p-4 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'} rounded-lg animate-pulse`}>
              <div className="flex-1">
                <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-48 mb-2`}></div>
                <div className={`h-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-24`}></div>
              </div>
              <div className={`h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-20`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!tests || tests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-8 text-center`}
      >
        <div className="inline-flex p-4 bg-teal-500/10 rounded-full mb-4">
          <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg mb-2`}>
          No tests taken yet
        </h3>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-4`}>
          Start practicing to see your test history here!
        </p>
        <button
          onClick={() => navigate('/study-hub')}
          className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors duration-200"
        >
          Start Practicing
        </button>
      </motion.div>
    );
  }

  // Show only first 3 tests
  const displayTests = tests.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-xl`}>Recent Tests</h2>
        <button
          onClick={() => navigate('/analytics')}
          className="text-teal-500 hover:text-teal-400 text-sm font-medium transition-colors duration-200"
        >
          View All →
        </button>
      </div>

      {/* Test List */}
      <div className="space-y-3">
        {displayTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`flex items-center justify-between p-4 ${isDark ? 'bg-gray-800/30 hover:bg-gray-800/50' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-all duration-200 group`}
          >
            {/* Test Info */}
            <div className="flex-1 min-w-0">
              <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium text-sm mb-1 truncate`}>
                {test.chapterTitle}
              </h3>
              <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>{formatRelativeDate(test.attemptedAt)}</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span className="text-gray-500">{test.subject}</span>
                {test.type === 'mock' && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium">
                    Mock
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3 ml-4">
              <div className="text-right">
                <div className={`text-lg font-bold ${test.percentage >= 80 ? 'text-green-500' :
                    test.percentage >= 60 ? 'text-yellow-500' :
                      'text-red-500'
                  }`}>
                  {test.displayScore || `${test.score}/${test.type === 'mock' ? (test.maxScore || test.totalQuestions) : test.totalQuestions}`}
                </div>
                <div className="text-xs text-gray-500">
                  {test.percentage}%
                </div>
              </div>

              {/* Analysis Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (test.type === 'mock') {
                    navigate(`/result/${test.id}`);
                  } else if (test.chapterId) {
                    navigate(`/study-hub/chapter/${test.chapterId}`);
                  }
                }}
                className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-500 rounded-lg text-sm font-medium transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                Analysis →
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
