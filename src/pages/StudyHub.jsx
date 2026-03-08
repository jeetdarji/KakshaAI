import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    FileText,
    ScrollText,
    BookMarked,
    ArrowRight,
    Download,
    Upload,
    Lightbulb,
    Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchChapters, fetchFormulaBook } from '../lib/studyHub';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChapterCard from '../components/studyhub/ChapterCard';
import SubjectFilter from '../components/studyhub/SubjectFilter';
import FormulaBookCard from '../components/studyhub/FormulaBookCard';
import UserNotesList from '../components/studyhub/UserNotesList';
import { useTheme } from '../contexts/ThemeContext';

const StudyHub = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('chapters');
    const [activeNotesSubject, setActiveNotesSubject] = useState('Physics');
    const [userId, setUserId] = useState(null);
    const [formulaBook, setFormulaBook] = useState(null);
    const { isDark } = useTheme();

    // Filter states
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Data states
    const [chapters, setChapters] = useState([]);
    const [loadingChapters, setLoadingChapters] = useState(true);

    // Get current user
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
        };
        getUser();
    }, []);

    // Fetch chapters from Supabase
    useEffect(() => {
        const loadChapters = async () => {
            setLoadingChapters(true);
            try {
                const data = await fetchChapters({ userId });
                setChapters(data || []);
            } catch (err) {
                console.error('Error loading chapters:', err);
            } finally {
                setLoadingChapters(false);
            }
        };
        loadChapters();
    }, [userId]);

    // Fetch formula book for selected subject
    useEffect(() => {
        const loadFormulaBook = async () => {
            if (!activeNotesSubject) return;

            try {
                const data = await fetchFormulaBook(activeNotesSubject);
                setFormulaBook(data);
            } catch (err) {
                console.error('Error fetching formula book:', err);
            }
        };

        if (activeTab === 'notes') {
            loadFormulaBook();
        }
    }, [activeNotesSubject, activeTab]);

    // Fallback formula book data
    const getDefaultFormulaBook = (subject) => ({
        id: `fb-${subject.toLowerCase()}`,
        title: `${subject} Complete Formula Book`,
        subject: subject,
        page_count: subject === 'Maths' ? 85 : subject === 'Physics' ? 120 : 95,
        description: `Complete formula compilation for ${subject} (11th + 12th). All chapters covered.`,
        file_url: '#',
    });

    const displayFormulaBook = formulaBook || getDefaultFormulaBook(activeNotesSubject);

    // Filter chapters based on search and subject
    const filteredChapters = useMemo(() => {
        return chapters.filter(chapter => {
            const matchesSubject = selectedSubject === 'all' || chapter.subject === selectedSubject;
            const matchesSearch = chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                chapter.subject.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSubject && matchesSearch;
        });
    }, [chapters, selectedSubject, searchQuery]);

    const handleChapterClick = (chapter) => {
        navigate(`/study-hub/chapter/${chapter.id}`);
    };

    const handleFormulaDownload = (book) => {
        if (book?.file_url && book.file_url !== '#') {
            window.open(book.file_url, '_blank');
        } else {
            alert('Formula book will be available soon!');
        }
    };

    const tabs = [
        { id: 'chapters', label: 'Chapters', icon: BookOpen },
        { id: 'notes', label: 'Notes', icon: FileText },
        { id: 'papers', label: 'Past Papers', icon: ScrollText, isLink: true, to: '/papers' },
    ];

    const notesSubjectTabs = ['Physics', 'Chemistry', 'Maths'];

    const subjectColors = {
        Physics: {
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
        },
        Chemistry: {
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400',
        },
        Maths: {
            iconBg: 'bg-orange-500/10',
            iconColor: 'text-orange-400',
        },
    };

    const colors = subjectColors[activeNotesSubject] || subjectColors.Physics;

    return (
        <div className="container mx-auto px-6 py-8 space-y-8 pt-32">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-4xl md:text-5xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                        Study Hub
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`mt-2 font-general max-w-md ${isDark ? 'text-white/50' : 'text-gray-500'}`}
                    >
                        Your central command for all learning material. Videos, notes, and practice - all in one place.
                    </motion.p>
                </div>

                {/* Tab Navigation */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`flex p-1.5 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-dark-card/50 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}
                >
                    {tabs.map((tab) => (
                        tab.isLink ? (
                            <Link key={tab.id} to={tab.to}>
                                <button className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all font-general flex items-center gap-2 ${isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            </Link>
                        ) : (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all font-general flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-brand text-white shadow-lg shadow-brand/25'
                                    : isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        )
                    ))}
                </motion.div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {/* CHAPTERS TAB */}
                {activeTab === 'chapters' && (
                    <motion.div
                        key="chapters"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Filters */}
                        <SubjectFilter
                            selectedSubject={selectedSubject}
                            onSubjectChange={setSelectedSubject}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                        />

                        {/* Results Count */}
                        <div className={`flex items-center justify-between text-sm font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            <p>
                                Showing <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredChapters.length}</span> chapters
                                {selectedSubject !== 'all' && (
                                    <span> in <span className="text-brand">{selectedSubject}</span></span>
                                )}
                            </p>
                            {(selectedSubject !== 'all' || searchQuery) && (
                                <button
                                    onClick={() => { setSelectedSubject('all'); setSearchQuery(''); }}
                                    className="text-brand hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        {/* Loading State */}
                        {loadingChapters ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                            </div>
                        ) : filteredChapters.length > 0 ? (
                            /* Chapter Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredChapters.map((chapter, i) => (
                                    <ChapterCard
                                        key={chapter.id}
                                        chapter={{
                                            ...chapter,
                                            classYear: chapter.class,
                                            totalTopics: chapter.total_topics || 10,
                                            completedTopics: Math.round((chapter.progress || 0) / 10),
                                            hasVideos: true,
                                            hasNotes: true,
                                            hasPractice: true,
                                        }}
                                        index={i}
                                        onClick={() => handleChapterClick(chapter)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="p-12 text-center">
                                <BookOpen className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={64} />
                                <h3 className={`text-xl font-heading font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No chapters found</h3>
                                <p className={`font-general mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                    Try adjusting your search or filters
                                </p>
                                <Button
                                    onClick={() => { setSelectedSubject('all'); setSearchQuery(''); }}
                                    variant="secondary"
                                >
                                    Clear Filters
                                </Button>
                            </Card>
                        )}
                    </motion.div>
                )}

                {/* NOTES TAB - User Upload CRUD Feature */}
                {activeTab === 'notes' && (
                    <motion.div
                        key="notes"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Subject Sub-tabs */}
                        <div className={`flex gap-2 p-1 rounded-xl border w-fit ${isDark ? 'bg-dark-card/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                            {notesSubjectTabs.map((subject) => (
                                <button
                                    key={subject}
                                    onClick={() => setActiveNotesSubject(subject)}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all font-general ${activeNotesSubject === subject
                                        ? isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900 shadow-sm'
                                        : isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {subject}
                                </button>
                            ))}
                        </div>

                        {/* User Notes Upload Section */}
                        <div className="max-w-3xl">
                            <h2 className={`text-2xl font-heading font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <Upload className="text-brand" size={24} />
                                Your {activeNotesSubject} Notes
                            </h2>

                            {userId ? (
                                <UserNotesList
                                    subject={activeNotesSubject}
                                    userId={userId}
                                />
                            ) : (
                                <Card className="p-10 text-center">
                                    <FileText className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={48} />
                                    <h4 className={`text-lg font-heading font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sign in to upload notes</h4>
                                    <p className={`font-general text-sm mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                        Create an account to upload and manage your personal study notes.
                                    </p>
                                    <Link to="/login">
                                        <Button variant="primary">Sign In</Button>
                                    </Link>
                                </Card>
                            )}
                        </div>

                        {/* Formula Books Section */}
                        <div className={`mt-12 pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3 mb-6">
                                <BookMarked className="text-brand" size={24} />
                                <h2 className={`text-2xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Complete {activeNotesSubject} Formula Book</h2>
                            </div>

                            <div className="max-w-xl">
                                <Card className="p-6">
                                    <div className="flex items-start gap-5">
                                        <div className={`p-4 rounded-xl ${colors.iconBg} flex-shrink-0`}>
                                            <BookOpen size={40} className={colors.iconColor} />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-heading font-bold text-brand mb-2">
                                                {displayFormulaBook.title}
                                            </h3>
                                            <p className={`font-general text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                                {displayFormulaBook.description || `Complete formula compilation for ${activeNotesSubject} (11th + 12th). All chapters covered.`}
                                            </p>
                                            <div className={`flex items-center gap-4 text-sm font-general mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                                <span className="flex items-center gap-1.5">
                                                    <FileText size={14} />
                                                    {displayFormulaBook.page_count || displayFormulaBook.pageCount} pages
                                                </span>
                                                <span>•</span>
                                                <span>11th + 12th</span>
                                            </div>
                                            <Button
                                                variant="primary"
                                                onClick={() => handleFormulaDownload(displayFormulaBook)}
                                            >
                                                <Download size={16} className="mr-2" />
                                                Download PDF
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Helper Text */}
                            <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10 max-w-xl">
                                <Lightbulb className="text-brand flex-shrink-0 mt-0.5" size={18} />
                                <p className={`text-sm font-general ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                    This formula book covers ALL {activeNotesSubject} chapters from 11th and 12th standard.
                                    Use it for quick revision before exams!
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyHub;
