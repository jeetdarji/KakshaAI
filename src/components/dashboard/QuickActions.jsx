import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * QuickActions Component
 * Displays four quick action buttons for navigation
 */
export default function QuickActions() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const actions = [
    {
      title: 'Practice Now',
      description: 'Continue learning',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-500/10',
      hoverColor: 'hover:bg-teal-500/20',
      onClick: () => navigate('/mock-tests')
    },
    {
      title: 'View Analytics',
      description: 'Track your progress',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      hoverColor: 'hover:bg-purple-500/20',
      onClick: () => navigate('/analytics')
    },
    {
      title: 'Revision Notes',
      description: 'Review key concepts',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      hoverColor: 'hover:bg-green-500/20',
      onClick: () => navigate('/study-hub?tab=notes')
    },
    {
      title: 'Past Papers',
      description: 'Practice with real exams',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      hoverColor: 'hover:bg-orange-500/20',
      onClick: () => navigate('/papers')
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className={`
            relative overflow-hidden
            ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6
            ${action.hoverColor}
            transition-all duration-300
            text-left group
          `}
        >
          {/* Gradient Background */}
          <div className={`
            absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 
            group-hover:opacity-10 transition-opacity duration-300
          `} />

          {/* Content */}
          <div className="relative z-10">
            <div className={`
              inline-flex p-3 rounded-lg ${action.bgColor} mb-4
              group-hover:scale-110 transition-transform duration-300
            `}>
              <div className={`${isDark ? 'text-white' : 'text-gray-700'}`}>
                {action.icon}
              </div>
            </div>

            <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg mb-1`}>
              {action.title}
            </h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
              {action.description}
            </p>

            {/* Arrow Icon */}
            <div className="absolute top-6 right-6 text-gray-600 group-hover:text-teal-500 group-hover:translate-x-1 transition-all duration-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
