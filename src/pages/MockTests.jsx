import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, AlertCircle, ChevronRight, ChevronDown, Calculator, Database, Trophy, Zap, BarChart3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const MockTests = () => {
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [showAllAttempts, setShowAllAttempts] = useState(false);
    const { isDark } = useTheme();

    // Fetch Live Tests and Previous Attempts from Database
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    setCurrentUser(null);
                } else {
                    setCurrentUser(user);
                }

                const { data: testsData, error: testsError } = await supabase
                    .from('tests')
                    .select(`
                        *,
                        sections (
                            id,
                            name,
                            questions (
                                id,
                                marks
                            )
                        )
                    `)
                    .order('created_at', { ascending: true });

                if (testsError) throw testsError;

                const enrichedTests = (testsData || []).map(test => {
                    const questionCount = test.sections?.reduce((sum, section) => {
                        return sum + (section.questions?.length || 0);
                    }, 0) || 0;
                    const duration = test.duration_mins || 180;
                    return {
                        ...test,
                        total_questions: test.total_questions || questionCount,
                        duration: duration,
                        duration_mins: duration,
                        is_active: test.is_active !== false
                    };
                });

                setTests(enrichedTests);

                if (user) {
                    const { data: submissionsData, error: submissionsError } = await supabase
                        .from('submissions')
                        .select(`
                            *,
                            tests (
                                title,
                                difficulty,
                                total_marks
                            )
                        `)
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (!submissionsError) {
                        setSubmissions(submissionsData || []);
                    }
                } else {
                    setSubmissions([]);
                }
            } catch (error) {
                setError(error.message || 'Failed to load tests');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const visibleSubmissions = showAllAttempts ? submissions : submissions.slice(0, 3);

    const getDifficultyConfig = (difficulty) => {
        switch (difficulty) {
            case 'Hard': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-red-500/5' };
            case 'Medium': return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/5' };
            default: return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/5' };
        }
    };

    return (
        <div className="container mx-auto px-6 py-8 space-y-10 pt-32 max-w-6xl">
            {/* Header */}
            <div>
                <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-3xl md:text-4xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                    Mock Tests
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`mt-2 font-general text-base ${isDark ? 'text-white/45' : 'text-gray-500'}`}
                >
                    Simulate the real exam environment with timed, full-length practice tests.
                </motion.p>
            </div>

            {/* Error Banner */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle size={20} />
                        <p className="font-semibold text-sm">Error loading tests</p>
                    </div>
                    <p className="text-sm text-red-300 mt-1">{error}</p>
                </motion.div>
            )}

            {/* Live Tests Section */}
            <div>
                <div className="flex items-center gap-2.5 mb-6">
                    <div className="relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block absolute inset-0 animate-ping opacity-75"></span>
                    </div>
                    <h2 className={`text-xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Available Tests
                    </h2>
                </div>

                {loading ? (
                    <div className={`text-center py-16 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        <div className="inline-flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                            <p className="font-general text-sm">Loading available tests...</p>
                        </div>
                    </div>
                ) : tests.length === 0 ? (
                    <div className="text-center py-16">
                        <div className={`inline-flex flex-col items-center gap-4 rounded-2xl p-10 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-gray-50 border-gray-200'}`}>
                            <Database className={`w-12 h-12 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                            <div>
                                <p className={`font-semibold font-heading mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Active Tests</p>
                                <p className={`text-sm font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    Tests will appear here once they are published.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {tests.map((test, i) => {
                            const diff = getDifficultyConfig(test.difficulty);
                            return (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08, duration: 0.4 }}
                                    className={`group relative rounded-2xl p-6 border backdrop-blur-xl overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                                        isDark
                                            ? 'bg-white/[0.03] border-white/[0.06] hover:border-brand/30 hover:shadow-[0_8px_40px_-12px_rgba(20,184,166,0.15)]'
                                            : 'bg-white border-gray-200 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5'
                                    }`}
                                    onClick={() => navigate(`/attempt/${test.id}`)}
                                >
                                    {/* Hover glow */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    <div className="relative z-10">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg font-general uppercase tracking-wider ${isDark ? 'bg-white/[0.06] text-white/50' : 'bg-gray-100 text-gray-500'}`}>
                                                    {test.total_questions || 'N/A'} Qs
                                                </span>
                                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg font-general border ${diff.bg} ${diff.color} ${diff.border}`}>
                                                    {test.difficulty || 'Medium'}
                                                </span>
                                            </div>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${isDark ? 'bg-brand/10' : 'bg-brand/5'}`}>
                                                <Zap size={16} className="text-brand" />
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h3 className={`font-heading font-bold text-lg mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {test.title}
                                        </h3>
                                        <p className={`text-sm font-general mb-5 line-clamp-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                            {test.description || 'Full-length practice test'}
                                        </p>

                                        {/* Stats */}
                                        <div className={`flex items-center gap-4 text-xs font-general mb-5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={13} /> {test.duration_mins || 180} mins
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calculator size={13} /> {test.total_marks || 200} marks
                                            </span>
                                        </div>

                                        {/* Start button */}
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/attempt/${test.id}`);
                                            }}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-emerald-500 text-white font-semibold text-sm font-general flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all duration-300"
                                        >
                                            Start Test
                                            <ChevronRight size={16} />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Previous Attempts */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <Trophy size={18} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                        <h2 className={`text-xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Recent Attempts
                        </h2>
                        {submissions.length > 0 && (
                            <span className={`text-xs font-general px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'}`}>
                                {submissions.length}
                            </span>
                        )}
                    </div>
                </div>

                {!currentUser ? (
                    <div className={`text-center py-10 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.06] text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        <p className="font-general text-sm">Sign in to view your test history.</p>
                    </div>
                ) : loading ? (
                    <div className={`text-center py-10 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        <div className="inline-flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                            <p className="font-general text-sm">Loading attempts...</p>
                        </div>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className={`text-center py-10 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.06] text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        <p className="font-general text-sm">No attempts yet. Take your first test above!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {visibleSubmissions.map((submission, i) => {
                                const scorePercent = submission.max_score ? Math.round((submission.score / submission.max_score) * 100) : 0;
                                const scoreColor = scorePercent >= 80 ? 'text-emerald-400' : scorePercent >= 50 ? 'text-amber-400' : 'text-red-400';
                                return (
                                    <motion.div
                                        key={submission.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`group rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 border backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 ${
                                            isDark
                                                ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                                                : 'bg-white border-gray-200 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-brand/10' : 'bg-brand/5'}`}>
                                                <CheckCircle size={20} className="text-brand" />
                                            </div>
                                            <div>
                                                <h3 className={`font-heading font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {submission.tests?.title || 'Unknown Test'}
                                                </h3>
                                                <p className={`text-xs font-general mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-500'}`}>
                                                    {submission.tests?.difficulty || 'N/A'} &middot; {new Date(submission.created_at).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <span className={`block text-xl font-bold font-heading ${scoreColor}`}>
                                                    {submission.score || 0}
                                                    <span className={`text-sm font-normal ${isDark ? 'text-white/25' : 'text-gray-400'}`}>/{submission.max_score || 0}</span>
                                                </span>
                                                <span className={`text-[10px] font-general uppercase tracking-wider ${isDark ? 'text-white/25' : 'text-gray-400'}`}>Score</span>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => navigate(`/result/${submission.id}`)}
                                                className={`px-4 py-2 rounded-xl text-xs font-semibold font-general flex items-center gap-1.5 transition-all ${
                                                    isDark
                                                        ? 'bg-white/[0.04] hover:bg-white/[0.08] text-brand border border-white/[0.06]'
                                                        : 'bg-brand/5 hover:bg-brand/10 text-brand border border-brand/10'
                                                }`}
                                            >
                                                <BarChart3 size={13} />
                                                Analysis
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* See All / Collapse button */}
                        {submissions.length > 3 && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={() => setShowAllAttempts(!showAllAttempts)}
                                className={`w-full py-3 rounded-xl text-sm font-general font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                                    isDark
                                        ? 'bg-white/[0.03] hover:bg-white/[0.06] text-white/50 border border-white/[0.06]'
                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                            >
                                {showAllAttempts ? 'Show Less' : `See All ${submissions.length} Attempts`}
                                <motion.div
                                    animate={{ rotate: showAllAttempts ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown size={16} />
                                </motion.div>
                            </motion.button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MockTests;