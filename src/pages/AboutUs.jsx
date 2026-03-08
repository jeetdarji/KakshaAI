import React from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Lightbulb, Rocket, Heart, GraduationCap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

const AboutUs = () => {
    const { isDark } = useTheme();

    const values = [
        { icon: Target, title: 'Mission-Driven', desc: 'Every feature we build is designed to help students crack MHT-CET with confidence and clarity.' },
        { icon: Lightbulb, title: 'Innovation First', desc: 'We leverage AI and data science to create personalized learning experiences that adapt to each student.' },
        { icon: Heart, title: 'Student-Centric', desc: 'Built by students, for students. We understand the pressure and have designed tools to ease the journey.' },
        { icon: Rocket, title: 'Excellence', desc: 'We strive for excellence in everything — from content quality to platform performance to user experience.' },
    ];

    return (
        <div className={`min-h-screen pt-28 pb-20 transition-colors duration-300 ${isDark ? 'bg-[#060608]' : 'bg-white'}`}>
            <div className="container mx-auto px-6 max-w-4xl">

                {/* Hero */}
                <motion.div className="text-center mb-20" {...fadeUp}>
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-general font-medium mb-6 ${isDark ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-brand/5 text-brand border border-brand/10'}`}>
                        <GraduationCap size={14} />
                        Our Story
                    </div>
                    <h1 className={`text-4xl md:text-5xl font-heading font-bold leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Empowering students to
                        <br />
                        <span className="bg-gradient-to-r from-brand via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                            achieve their dreams
                        </span>
                    </h1>
                    <p className={`text-lg font-general leading-relaxed max-w-2xl mx-auto ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                        KakshaAI was born from a simple idea: MHT-CET preparation deserves a modern, intelligent approach. We're building the platform we wished we had.
                    </p>
                </motion.div>

                {/* Story Section */}
                <motion.div
                    className="mb-20"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className={`rounded-2xl p-8 md:p-12 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-gray-50 border-gray-200'}`}>
                        <h2 className={`text-2xl font-heading font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Why KakshaAI?
                        </h2>
                        <div className={`space-y-5 text-base font-general leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                            <p>
                                Preparing for MHT-CET is one of the most crucial phases in a student's academic life in Maharashtra. With lakhs of students competing for limited seats in engineering and pharmacy colleges, the pressure is immense.
                            </p>
                            <p>
                                We noticed that most preparation platforms offered generic content — the same study material, the same mock tests, with no personalization. Students were left guessing where they stood, what to focus on, and how to improve.
                            </p>
                            <p>
                                KakshaAI changes that. Our AI-powered analytics engine tracks your performance across every topic, identifies your weak areas, and creates a tailored study plan. Combined with practice questions, past papers, cutoff data, and a smart mock test engine — we give you everything you need in one place.
                            </p>
                            <p>
                                We are a team of engineers and educators from Maharashtra building KakshaAI with one goal: to make world-class preparation tools accessible to every student — regardless of their background or budget.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Values */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <div className="text-center mb-12">
                        <h2 className={`text-2xl md:text-3xl font-heading font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Our Values
                        </h2>
                        <p className={`font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            The principles that guide everything we do.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {values.map((v, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className={`rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-0.5 ${
                                    isDark
                                        ? 'bg-white/[0.02] border-white/[0.06] hover:border-brand/20'
                                        : 'bg-white border-gray-200 hover:border-brand/30 hover:shadow-lg'
                                }`}
                            >
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-brand/10' : 'bg-brand/5'}`}>
                                    <v.icon size={20} className="text-brand" />
                                </div>
                                <h3 className={`font-heading font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {v.title}
                                </h3>
                                <p className={`text-sm font-general leading-relaxed ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    {v.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                    className="mt-20"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <div className={`rounded-2xl p-8 md:p-12 border text-center ${isDark ? 'bg-gradient-to-br from-brand/[0.06] to-transparent border-brand/10' : 'bg-gradient-to-br from-brand/[0.03] to-transparent border-brand/10'}`}>
                        <h3 className={`text-2xl font-heading font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Ready to start your preparation?
                        </h3>
                        <p className={`text-sm font-general mb-6 max-w-lg mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            KakshaAI brings together AI-powered analytics, curated study material, mock tests, past papers, and cutoff data — everything you need to ace MHT-CET, all in one place.
                        </p>
                        <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-emerald-500 text-white font-semibold text-sm font-general shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all duration-300">
                            Get Started Free
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AboutUs;
