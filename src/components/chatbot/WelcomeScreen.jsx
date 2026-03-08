import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap, BookOpen, Brain, TrendingUp, MessageCircle, Calculator, Heart } from 'lucide-react';


const WelcomeScreen = ({ onSuggestionSelect, isDark }) => {
    const capabilities = [
        {
            icon: GraduationCap,
            title: 'College Admissions',
            desc: 'Real cutoff data from 367 colleges',
            color: 'text-brand',
            bg: isDark ? 'bg-brand/10' : 'bg-brand/5',
        },
        {
            icon: BookOpen,
            title: 'Doubt Solving',
            desc: 'Physics, Chemistry & Maths',
            color: 'text-blue-400',
            bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
        },
        {
            icon: Calculator,
            title: 'Study Planning',
            desc: 'Personalized prep strategies',
            color: 'text-purple-400',
            bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
        },
        {
            icon: Heart,
            title: 'Motivation',
            desc: 'Stay focused & confident',
            color: 'text-rose-400',
            bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
        },
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8 overflow-y-auto">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8 max-w-2xl"
            >
                {/* Logo / Avatar */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-brand/20"
                >
                    <Sparkles size={28} className="text-white" />
                </motion.div>

                <h1 className={`text-3xl md:text-4xl font-clash font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Hi! I'm your{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-emerald-400">
                        KakshaAI
                    </span>{' '}
                    Assistant
                </h1>
                <p className={`text-base md:text-lg font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Your personal MHT-CET tutor, counselor & study buddy
                </p>
            </motion.div>

            {/* Capability Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-2xl w-full"
            >
                {capabilities.map((cap, idx) => (
                    <motion.div
                        key={cap.title}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 + idx * 0.07 }}
                        className={`p-4 rounded-xl border text-center ${
                            isDark
                                ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                                : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                        } transition-all duration-200`}
                    >
                        <div className={`w-10 h-10 rounded-lg ${cap.bg} flex items-center justify-center mx-auto mb-2`}>
                            <cap.icon size={20} className={cap.color} />
                        </div>
                        <h3 className={`text-xs font-semibold mb-0.5 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                            {cap.title}
                        </h3>
                        <p className={`text-[10px] ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                            {cap.desc}
                        </p>
                    </motion.div>
                ))}
            </motion.div>


        </div>
    );
};

export default WelcomeScreen;
