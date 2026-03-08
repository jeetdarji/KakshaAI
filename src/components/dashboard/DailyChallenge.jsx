import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * DailyChallenge Component
 * Displays today's challenge with progress tracking
 */
export default function DailyChallenge({ challenge, loading = false }) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const { isDark } = useTheme();
  const confettiIntervalRef = useRef(null);

  // Cleanup confetti interval on unmount
  useEffect(() => {
    return () => {
      if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
    };
  }, []);

  // Trigger confetti when challenge is completed
  useEffect(() => {
    if (challenge?.userProgress?.completed && !showConfetti) {
      triggerConfetti();
      setShowConfetti(true);
    }
  }, [challenge?.userProgress?.completed]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    // Clear any existing confetti interval
    if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
    confettiIntervalRef.current = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(confettiIntervalRef.current);
        confettiIntervalRef.current = null;
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleStartChallenge = () => {
    if (!challenge) return;

    // Navigate based on challenge type
    switch (challenge.challenge_type) {
      case 'questions':
        navigate(`/study-hub?subject=${challenge.subject}`);
        break;
      case 'video':
        navigate(`/study-hub?subject=${challenge.subject}&tab=videos`);
        break;
      case 'revision':
        navigate(`/study-hub?subject=${challenge.subject}&tab=notes`);
        break;
      case 'perfect_practice':
        navigate(`/study-hub?subject=${challenge.subject}`);
        break;
      case 'mock_test':
        navigate('/mock-tests');
        break;
      default:
        navigate('/study-hub');
    }
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className={`bg-gradient-to-br ${isDark ? 'from-teal-500/10 to-cyan-500/10' : 'from-teal-50 to-cyan-50'} border border-teal-500/30 rounded-xl p-6 animate-pulse`}>
        <div className={`h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-4`}></div>
        <div className={`h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-full mb-4`}></div>
        <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mb-4`}></div>
        <div className={`h-10 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
      </div>
    );
  }

  // No challenge state
  if (!challenge) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-8 text-center`}
      >
        <div className="inline-flex p-4 bg-teal-500/10 rounded-full mb-4">
          <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg mb-2`}>
          No Challenge Today
        </h3>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
          Check back tomorrow for a new challenge!
        </p>
      </motion.div>
    );
  }

  const progress = challenge.userProgress || { current_progress: 0, target_count: challenge.target_count, completed: false };
  const progressPercentage = (progress.current_progress / progress.target_count) * 100;
  const isCompleted = progress.completed;

  // Motivational quotes
  const quotes = [
    "Success is the sum of small efforts repeated day in and day out.",
    "The expert in anything was once a beginner.",
    "Don't watch the clock; do what it does. Keep going.",
    "The secret of getting ahead is getting started.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn't just find you. You have to go out and get it.",
    "The harder you work for something, the greater you'll feel when you achieve it."
  ];

  // Select a consistent quote for the day
  const today = new Date().toDateString();
  const quoteIndex = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % quotes.length;
  const dailyQuote = quotes[quoteIndex];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`
        relative overflow-hidden rounded-xl p-6 border
        ${isCompleted 
          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50' 
          : 'bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30'
        }
      `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #14b8a6 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* Content - Horizontal Layout */}
      <div className="relative z-10 flex flex-col lg:flex-row gap-6">
        {/* Left Section - Challenge Details */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-500/20 rounded-lg">
                <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg`}>Daily Challenge</h2>
            </div>
            
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
                className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completed!
              </motion.div>
            )}
          </div>

          {/* Challenge Description */}
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-base mb-4 leading-relaxed`}>
            {challenge.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Progress</span>
              <span className="text-teal-400 font-medium">
                {progress.current_progress} / {progress.target_count}
              </span>
            </div>
            <div className={`h-2 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                }`}
              />
            </div>
          </div>

          {/* Reward Points */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Reward: <span className="text-yellow-500 font-medium">{challenge.reward_points} points</span>
            </span>
          </div>

          {/* Action Button */}
          {!isCompleted && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartChallenge}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-teal-500/30"
            >
              Start Challenge
            </motion.button>
          )}

          {isCompleted && (
            <div className="text-center py-2">
              <p className="text-green-500 font-medium">
                🎉 Great job! Come back tomorrow for a new challenge!
              </p>
            </div>
          )}
        </div>

        {/* Right Section - Motivational Quote */}
        <div className="lg:w-80 flex items-center justify-center">
          <div className="relative">
            {/* Quote Icon Background */}
            <div className="absolute -top-4 -left-4 text-teal-500/20 text-6xl font-serif">"</div>
            
            {/* Quote Content */}
            <div className="relative bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-teal-500/20">
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed italic mb-3`}>
                {dailyQuote}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent"></div>
                <span className="text-xs text-teal-500 font-medium">Daily Inspiration</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent"></div>
              </div>
            </div>
            
            {/* Decorative Element */}
            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-teal-500/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
