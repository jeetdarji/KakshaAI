import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle, Target, Zap } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * TopicAnalysisChart — Text-based UI showing strongest subjects & areas for improvement
 * Based ONLY on mock test data (no chapter quizzes)
 */
export default function TopicAnalysisChart({ strongestTopics = [], weakestTopics = [], loading = false }) {
  const { isDark } = useTheme();
  const subjectIcons = {
    Physics: <Zap className="w-5 h-5" />,
    Chemistry: <Target className="w-5 h-5" />,
    Mathematics: <TrendingUp className="w-5 h-5" />
  };

  const subjectColors = {
    Physics: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'bg-blue-500' },
    Chemistry: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    Mathematics: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'bg-orange-500' }
  };

  const getAccuracyBadge = (accuracy) => {
    if (accuracy >= 80) return { label: 'Excellent', color: 'text-green-400 bg-green-500/10 border-green-500/30' };
    if (accuracy >= 60) return { label: 'Good', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' };
    if (accuracy >= 40) return { label: 'Average', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Needs Work', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
  };

  const isEmpty = strongestTopics.length === 0 && weakestTopics.length === 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Strongest Topics Card */}
      <ChartContainer
        title="Strongest Subjects"
        subtitle="Your best performing areas in mock tests"
        loading={loading}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Award className="w-10 h-10 mb-3 opacity-40" />
            <p>Take mock tests to see your strengths</p>
          </div>
        ) : (
          <div className="space-y-4">
            {strongestTopics.map((subject, index) => {
              const colors = subjectColors[subject.topic] || subjectColors.Physics;
              const badge = getAccuracyBadge(subject.accuracy);
              return (
                <motion.div
                  key={subject.topic}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.4 }}
                  className={`${colors.bg} ${colors.border} border rounded-xl p-4`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`${colors.text}`}>
                        {subjectIcons[subject.topic] || <Award className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-sm`}>{subject.topic}</h4>
                        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                          {subject.correct}/{subject.total} questions correct · {subject.testCount} {subject.testCount === 1 ? 'test' : 'tests'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Accuracy Bar */}
                  <div className={`w-full h-2 ${isDark ? 'bg-gray-700/50' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.accuracy}%` }}
                      transition={{ duration: 1, delay: index * 0.15 + 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${colors.bar}`}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className={`text-xs font-bold ${colors.text}`}>{subject.accuracy}%</span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ChartContainer>

      {/* Areas for Improvement Card */}
      <ChartContainer
        title="Areas for Improvement"
        subtitle="Subjects that need more practice"
        loading={loading}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <TrendingDown className="w-10 h-10 mb-3 opacity-40" />
            <p>Take mock tests to see improvement areas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {weakestTopics.map((subject, index) => {
              const colors = subjectColors[subject.topic] || subjectColors.Physics;
              const isLow = subject.accuracy < 50;
              return (
                <motion.div
                  key={subject.topic}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.4 }}
                  className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={isLow ? 'text-red-400' : 'text-yellow-400'}>
                        {isLow
                          ? <AlertTriangle className="w-5 h-5" />
                          : <CheckCircle className="w-5 h-5" />
                        }
                      </div>
                      <div>
                        <h4 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-sm`}>{subject.topic}</h4>
                        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                          {subject.accuracy}% accuracy · {subject.correct}/{subject.total} correct
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${isLow ? 'text-red-400' : 'text-yellow-400'}`}>
                      {subject.accuracy}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className={`w-full h-2 ${isDark ? 'bg-gray-700/50' : 'bg-gray-200'} rounded-full overflow-hidden mb-3`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.accuracy}%` }}
                      transition={{ duration: 1, delay: index * 0.15 + 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-yellow-500'}`}
                    />
                  </div>

                  {/* Improvement Tip */}
                  {subject.improvementTip && (
                    <div className={`${isLow ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'} border rounded-lg p-3`}>
                      <p className={`text-xs ${isLow ? 'text-red-300' : 'text-yellow-300'}`}>
                        💡 {subject.improvementTip}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </ChartContainer>
    </div>
  );
}
