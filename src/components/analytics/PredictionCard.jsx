import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * PredictionCard - Card displaying MHT-CET score prediction for a specific shift scenario
 * Shows predicted score, percentile, and scenario-specific styling
 */
export default function PredictionCard({ scenario, predictedScore, percentile, confidence }) {
  const { isDark } = useTheme();
  // Scenario-specific colors
  const scenarioColors = {
    Easy: {
      bg: 'from-green-500/20 to-green-600/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      badge: 'bg-green-500/20 text-green-400'
    },
    Moderate: {
      bg: 'from-yellow-500/20 to-yellow-600/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      badge: 'bg-yellow-500/20 text-yellow-400'
    },
    Hard: {
      bg: 'from-red-500/20 to-red-600/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      badge: 'bg-red-500/20 text-red-400'
    }
  };

  const colors = scenarioColors[scenario] || scenarioColors.Moderate;

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      className={`bg-gradient-to-br ${colors.bg} rounded-xl p-6 border ${colors.border} shadow-lg`}
    >
      {/* Scenario Label */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-semibold ${colors.text}`}>
          {scenario} Shift
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${colors.badge}`}>
          {confidence} Confidence
        </span>
      </div>

      {/* Predicted Score */}
      <div className="mb-4">
        <div className={`text-4xl font-bold ${colors.text}`}>
          <AnimatedCounter value={predictedScore} decimals={0} suffix="/200" />
        </div>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>Predicted Score</p>
      </div>

      {/* Percentile Badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <AnimatedCounter value={percentile} decimals={1} suffix="%" />
          </div>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Percentile</p>
        </div>

        {/* Progress Bar */}
        <div className={`w-24 h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(predictedScore / 200) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${colors.bg.replace('/20', '').replace('/10', '')}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
