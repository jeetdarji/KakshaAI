import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, BookOpen, Brain, TrendingUp, Lightbulb, Target } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const blogPosts = [
    {
        id: 1,
        title: 'How to Create the Perfect MHT-CET Study Plan',
        excerpt: 'A structured study plan is the backbone of effective preparation. Learn how to divide your time across Physics, Chemistry, and Mathematics for maximum results.',
        category: 'Study Tips',
        readTime: '6 min read',
        date: 'Feb 20, 2026',
        icon: Target,
        content: [
            'Creating an effective study plan for MHT-CET requires understanding the exam pattern, your strengths, and the time you have available.',
            'Start by analyzing the exam syllabus — MHT-CET covers Physics, Chemistry, and Mathematics from Class 11 and 12. Allocate time proportional to the weightage of each subject.',
            'Break your study sessions into 50-minute focused blocks followed by 10-minute breaks. This technique, known as the Pomodoro method, maximizes retention.',
            'Dedicate mornings to problem-solving and conceptual subjects like Physics and Mathematics when your mind is fresh. Reserve evenings for Chemistry and revision.',
            'Include weekly mock tests in your plan. At KakshaAI, our AI analytics track your performance and automatically adjust your study plan based on your weak areas.',
            'Remember: consistency beats intensity. Studying 4 focused hours daily is more effective than 10 unfocused hours on weekends.'
        ]
    },
    {
        id: 2,
        title: 'Top 10 Mistakes to Avoid During MHT-CET Preparation',
        excerpt: 'Most students make these common mistakes during their preparation. Avoid them to significantly improve your score and rank.',
        category: 'Exam Strategy',
        readTime: '8 min read',
        date: 'Feb 12, 2026',
        icon: Lightbulb,
        content: [
            'Mistake #1: Not understanding the exam pattern. MHT-CET has negative marking only in specific sections — understanding this changes your attempt strategy.',
            'Mistake #2: Ignoring NCERT textbooks. Most MHT-CET questions are directly or indirectly based on NCERT concepts, especially in Chemistry.',
            'Mistake #3: Not taking enough mock tests. Mock tests are the closest simulation to the actual exam. Take at least 2 full-length tests per week.',
            'Mistake #4: Studying too many resources. Stick to 1-2 quality books per subject and master them instead of spreading yourself thin.',
            'Mistake #5: Neglecting revision. Follow the spaced repetition technique — revise topics at increasing intervals (1 day, 3 days, 7 days, 14 days).',
            'Mistake #6: Not analyzing your mock test results. Each mock test reveals patterns in your performance. Use KakshaAI\'s analytics to identify and fix your weak spots.'
        ]
    },
    {
        id: 3,
        title: 'Understanding MHT-CET Cutoffs: A Complete Guide',
        excerpt: 'Cutoffs can be confusing. This guide breaks down how cutoffs work, what affects them, and how to use historical data to set realistic targets.',
        category: 'Admissions',
        readTime: '7 min read',
        date: 'Jan 28, 2026',
        icon: TrendingUp,
        content: [
            'MHT-CET cutoffs are determined by multiple factors: the number of applicants, difficulty level of the exam, seat availability, and category-wise reservations.',
            'There are two types of cutoffs — qualifying cutoff (minimum percentile to be eligible) and admission cutoff (actual percentile required for a specific college/branch).',
            'Historical data shows that cutoffs for top colleges like COEP, VJTI, and ICT have remained relatively stable over the past 5 years, with variations of 2-5 percentile.',
            'Your preparation strategy should target a percentile 5-10 points above your desired college\'s cutoff to account for yearly variations.',
            'KakshaAI\'s Cutoff Tracker provides historical cutoff data for colleges across Maharashtra, helping you set realistic targets and track your progress against them.',
            'Pro tip: Don\'t just aim for a single college. Create a list of 10-15 colleges based on different percentile ranges to keep your options open during counseling.'
        ]
    },
    {
        id: 4,
        title: 'How AI is Revolutionizing Exam Preparation',
        excerpt: 'Artificial Intelligence is transforming how students prepare for competitive exams. Discover how KakshaAI uses machine learning to personalize your learning journey.',
        category: 'Technology',
        readTime: '5 min read',
        date: 'Jan 15, 2026',
        icon: Brain,
        content: [
            'Traditional exam preparation follows a one-size-fits-all approach. Every student gets the same content, same practice papers, and same study plan.',
            'AI changes this paradigm. By analyzing your performance data — response time, accuracy patterns, topic-wise strengths — AI creates a truly personalized experience.',
            'KakshaAI\'s recommendation engine uses machine learning to identify your knowledge gaps and suggest targeted practice questions tailored to your weak areas.',
            'Our predictive analytics can estimate your expected percentile based on your mock test performance, helping you gauge your preparation level in real-time.',
            'Spaced repetition algorithms ensure you revise concepts at optimal intervals, maximizing long-term retention.',
            'The future of education is adaptive and personal. KakshaAI is at the forefront of this revolution, making world-class exam preparation accessible to every student in Maharashtra.'
        ]
    },
];

const Blog = () => {
    const { isDark } = useTheme();
    const [expandedPost, setExpandedPost] = React.useState(null);

    return (
        <div className={`min-h-screen pt-28 pb-20 transition-colors duration-300 ${isDark ? 'bg-[#060608]' : 'bg-white'}`}>
            <div className="container mx-auto px-6 max-w-4xl">

                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-general font-medium mb-6 ${isDark ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-brand/5 text-brand border border-brand/10'}`}>
                        <BookOpen size={14} />
                        KakshaAI Blog
                    </div>
                    <h1 className={`text-4xl md:text-5xl font-heading font-bold leading-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Insights & Strategies
                    </h1>
                    <p className={`text-lg font-general max-w-xl mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        Expert tips, study strategies, and the latest on MHT-CET preparation.
                    </p>
                </motion.div>

                {/* Posts */}
                <div className="space-y-6">
                    {blogPosts.map((post, i) => (
                        <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                                isDark
                                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                                    : 'bg-white border-gray-200 hover:shadow-lg'
                            }`}
                        >
                            <div className="p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-brand/10' : 'bg-brand/5'}`}>
                                        <post.icon size={16} className="text-brand" />
                                    </div>
                                    <span className={`text-xs font-general font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider ${isDark ? 'bg-white/[0.04] text-white/50' : 'bg-gray-100 text-gray-500'}`}>
                                        {post.category}
                                    </span>
                                    <div className={`flex items-center gap-3 ml-auto text-xs font-general ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {post.date}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
                                    </div>
                                </div>

                                <h2 className={`text-xl md:text-2xl font-heading font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {post.title}
                                </h2>

                                <p className={`text-sm font-general leading-relaxed mb-4 ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                                    {post.excerpt}
                                </p>

                                {expandedPost === post.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className={`space-y-4 text-sm font-general leading-relaxed mb-4 ${isDark ? 'text-white/40' : 'text-gray-600'}`}
                                    >
                                        {post.content.map((para, j) => (
                                            <p key={j}>{para}</p>
                                        ))}
                                    </motion.div>
                                )}

                                <button
                                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                                    className="text-brand text-sm font-general font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all duration-200"
                                >
                                    {expandedPost === post.id ? 'Read Less' : 'Read More'}
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Blog;
