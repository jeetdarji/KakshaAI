import { motion } from 'framer-motion';
import { Trophy, Award, Star, Flame, Target, Zap } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * RewardsAndBadges Component
 * Displays user's total points and earned badges
 */
export default function RewardsAndBadges({ stats, activityData = [], loading = false }) {
  const { isDark } = useTheme();
  // Calculate total points from completed challenges
  const totalPoints = stats?.total_challenge_points || 0;

  // Calculate current streak from activity data
  const calculateCurrentStreak = () => {
    if (!activityData || activityData.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);

    // Count backwards from today
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = activityData.find(a => a.date === dateStr);
      
      if (activity && activity.intensity !== 'none') {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Calculate longest streak from activity data
  const calculateLongestStreak = () => {
    if (!activityData || activityData.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;

    // Sort by date
    const sortedData = [...activityData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    for (let i = 0; i < sortedData.length; i++) {
      if (sortedData[i].intensity !== 'none') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  };

  const currentStreak = calculateCurrentStreak();
  const longestStreak = calculateLongestStreak();

  // Define badges with unlock conditions
  const badges = [
    {
      id: 'streak_7',
      name: '7 Day Streak',
      description: 'Study for 7 days in a row',
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      unlocked: currentStreak >= 7 || longestStreak >= 7,
      progress: Math.min(currentStreak, 7),
      target: 7
    },
    {
      id: 'streak_30',
      name: '30 Day Warrior',
      description: 'Study for 30 consecutive days',
      icon: Award,
      color: 'from-blue-500 to-cyan-500',
      unlocked: currentStreak >= 30 || longestStreak >= 30,
      progress: Math.min(currentStreak, 30),
      target: 30
    },
    {
      id: 'streak_50',
      name: '50 Day Champion',
      description: 'Study for 50 consecutive days',
      icon: Trophy,
      color: 'from-purple-500 to-pink-500',
      unlocked: currentStreak >= 50 || longestStreak >= 50,
      progress: Math.min(currentStreak, 50),
      target: 50
    },
    {
      id: 'streak_100',
      name: '100 Day Legend',
      description: 'Study for 100 consecutive days',
      icon: Star,
      color: 'from-yellow-500 to-amber-500',
      unlocked: currentStreak >= 100 || longestStreak >= 100,
      progress: Math.min(currentStreak, 100),
      target: 100
    },
    {
      id: 'points_100',
      name: 'Point Collector',
      description: 'Earn 100 challenge points',
      icon: Zap,
      color: 'from-green-500 to-emerald-500',
      unlocked: totalPoints >= 100,
      progress: Math.min(totalPoints, 100),
      target: 100
    },
    {
      id: 'points_500',
      name: 'Point Master',
      description: 'Earn 500 challenge points',
      icon: Target,
      color: 'from-teal-500 to-cyan-500',
      unlocked: totalPoints >= 500,
      progress: Math.min(totalPoints, 500),
      target: 500
    }
  ];

  // Skeleton loader
  if (loading) {
    return (
      <div className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6 animate-pulse`}>
        <div className={`h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-6`}></div>
        <div className="space-y-4">
          <div className={`h-20 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
          <div className={`h-20 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6`}
    >
      {/* Header */}
      <h2 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-2xl mb-6 flex items-center gap-2`}>
        <Trophy className="w-6 h-6 text-yellow-500" />
        Rewards & Badges
      </h2>

      {/* Horizontal Layout: Points/Streak on left, Badges on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Section - Points & Streak */}
        <div className="lg:col-span-1 space-y-4">
          {/* Total Points */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-1`}>Total Points</p>
                <p className="text-3xl font-bold text-yellow-500">{totalPoints}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              </div>
            </div>
          </motion.div>

          {/* Current Streak */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-1`}>Current Streak</p>
                <p className="text-2xl font-bold text-orange-500">{currentStreak} days</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-7 h-7 text-orange-500" />
              </div>
            </div>
          </motion.div>

          {/* Motivational Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg"
          >
            <p className="text-teal-400 text-xs text-center leading-relaxed">
              {currentStreak === 0 
                ? "Start your streak today! 🚀"
                : currentStreak < 7
                ? `Keep going! ${7 - currentStreak} more days to unlock your first badge! 💪`
                : currentStreak < 30
                ? `Amazing! ${30 - currentStreak} more days to become a Warrior! 🔥`
                : currentStreak < 50
                ? `Incredible! ${50 - currentStreak} more days to become a Champion! 🏆`
                : currentStreak < 100
                ? `Legendary! ${100 - currentStreak} more days to ultimate glory! ⭐`
                : "You're a Legend! Keep crushing it! 👑"
              }
            </p>
          </motion.div>
        </div>

        {/* Right Section - Badges Grid */}
        <div className="lg:col-span-3">
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium text-lg mb-4`}>Achievement Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              const progressPercentage = (badge.progress / badge.target) * 100;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    relative overflow-hidden rounded-lg p-3 border
                    ${badge.unlocked 
                      ? 'bg-gradient-to-br ' + badge.color.replace('from-', 'from-').replace('to-', 'to-') + '/20 border-white/20' 
                      : isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                    }
                    transition-all duration-300 hover:scale-105
                  `}
                >
                  {/* Badge Icon */}
                  <div className={`
                    inline-flex p-2 rounded-lg mb-2
                    ${badge.unlocked ? 'bg-white/10' : isDark ? 'bg-gray-700/50' : 'bg-gray-200'}
                  `}>
                    <Icon 
                      className={`w-5 h-5 ${
                        badge.unlocked 
                          ? 'text-white' 
                          : 'text-gray-500'
                      }`}
                    />
                  </div>

                  {/* Badge Name */}
                  <h4 className={`
                    text-xs font-semibold mb-1
                    ${badge.unlocked ? 'text-white' : 'text-gray-500'}
                  `}>
                    {badge.name}
                  </h4>

                  {/* Progress or Unlocked Status */}
                  {badge.unlocked ? (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Unlocked!</span>
                    </div>
                  ) : (
                    <div>
                      <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                        <span>{badge.progress}/{badge.target}</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className={`h-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded-full overflow-hidden`}>
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Locked Overlay */}
                  {!badge.unlocked && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
