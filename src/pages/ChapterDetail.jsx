import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Video,
    FileText,
    BookOpen,
    ClipboardList,
    Play,
    Download,
    CheckCircle2,
    Clock,
    Lightbulb,
    Eye,
    Loader2,
    RefreshCw,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
    fetchChapterById,
    fetchChapterVideos,
    fetchChapterNotes,
    fetchPracticeQuestions,
    updateVideoProgress,
    submitPracticeAttempt,
    getPracticeAttempts,
    fetchFormulaBook,
    calculateChapterProgress,
    markVideoAsWatched,
    markNotesDownloaded,
    markFormulaViewed,
    savePracticeAttempt
} from '../lib/studyHub';
import { getYouTubeVideoId } from '../utils/youtube';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/studyhub/ProgressBar';
import VideoListItem from '../components/studyhub/VideoListItem';
import VideoPlayer from '../components/studyhub/VideoPlayer';
import { recordTestCompletion, recordVideoWatched, recordDownload, recordChapterCompleted } from '../lib/activityTracker';
import { incrementChallengeProgress, getTodayChallenge } from '../lib/challengeGenerator';
import { useTheme } from '../contexts/ThemeContext';

const ChapterDetail = () => {
    const { chapterId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('videos');
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [userId, setUserId] = useState(null);
    const { isDark } = useTheme();

    // Data states
    const [chapter, setChapter] = useState(null);
    const [videos, setVideos] = useState([]);
    const [chapterNotes, setChapterNotes] = useState([]);
    const [practiceQuestions, setPracticeQuestions] = useState([]);
    const [formulaBook, setFormulaBook] = useState(null);
    const [practiceAttempts, setPracticeAttempts] = useState([]);

    // Loading states
    const [loadingChapter, setLoadingChapter] = useState(true);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Practice quiz states
    const [quizMode, setQuizMode] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(null);
    const [testCompleted, setTestCompleted] = useState(false);
    const [bestTestScore, setBestTestScore] = useState(0);
    const [submittingQuiz, setSubmittingQuiz] = useState(false);

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

    // Fetch chapter details
    useEffect(() => {
        const loadChapter = async () => {
            if (!chapterId) return;

            setLoadingChapter(true);
            try {
                const data = await fetchChapterById(chapterId);

                // Load progress from database if user is logged in
                if (userId) {
                    const { data: progressData } = await supabase
                        .from('user_chapter_progress')
                        .select('practice_completed, practice_score')
                        .eq('user_id', userId)
                        .eq('chapter_id', chapterId)
                        .maybeSingle();

                    if (progressData?.practice_completed) {
                        // If practice is completed, add 40% to the base progress
                        const baseProgress = data?.progress || 0;
                        const progressWithPractice = Math.min(100, baseProgress + 40);
                        setChapter({
                            ...data,
                            progress: progressWithPractice,
                        });
                        setTestCompleted(true);
                        setBestTestScore(progressData.practice_score || 0);
                    } else {
                        setChapter(data);
                    }
                } else {
                    setChapter(data);
                }
            } catch (err) {
                console.error('Error loading chapter:', err);
            } finally {
                setLoadingChapter(false);
            }
        };
        loadChapter();
    }, [chapterId, userId]);

    // Fetch videos
    useEffect(() => {
        const loadVideos = async () => {
            if (!chapterId) return;

            setLoadingVideos(true);
            try {
                const data = await fetchChapterVideos(chapterId, userId);
                setVideos(data || []);

                // Set first video as active
                if (data?.length > 0 && !activeVideoId) {
                    setActiveVideoId(data[0].id);
                }
            } catch (err) {
                console.error('Error loading videos:', err);
            } finally {
                setLoadingVideos(false);
            }
        };
        loadVideos();
    }, [chapterId, userId]);

    // Fetch notes when tab changes
    useEffect(() => {
        if (activeTab === 'notes' && chapterId) {
            const loadNotes = async () => {
                setLoadingNotes(true);
                try {
                    const data = await fetchChapterNotes(chapterId);
                    setChapterNotes(data || []);
                } catch (err) {
                    console.error('Error loading notes:', err);
                } finally {
                    setLoadingNotes(false);
                }
            };
            loadNotes();
        }
    }, [activeTab, chapterId]);

    // Fetch practice questions when tab changes
    useEffect(() => {
        if (activeTab === 'practice' && chapterId) {
            const loadQuestions = async () => {
                setLoadingQuestions(true);
                try {
                    const data = await fetchPracticeQuestions(chapterId);
                    setPracticeQuestions(data || []);
                } catch (err) {
                    console.error('Error loading questions:', err);
                } finally {
                    setLoadingQuestions(false);
                }
            };
            loadQuestions();
        }
    }, [activeTab, chapterId, userId]);

    // Fetch formula book
    useEffect(() => {
        if (activeTab === 'formulas' && chapter?.subject) {
            const loadFormulaBook = async () => {
                try {
                    const data = await fetchFormulaBook(chapter.subject);
                    setFormulaBook(data);
                } catch (err) {
                    console.error('Error loading formula book:', err);
                }
            };
            loadFormulaBook();
        }
    }, [activeTab, chapter?.subject]);

    // Loading state
    if (loadingChapter) {
        return (
            <div className="container mx-auto px-6 py-8 pt-32 min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin" />
            </div>
        );
    }

    // Chapter not found
    if (!chapter) {
        return (
            <div className="container mx-auto px-6 py-8 pt-32 min-h-screen">
                <Card className="p-12 text-center max-w-lg mx-auto">
                    <BookOpen className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={64} />
                    <h3 className="text-xl font-heading font-bold mb-2">Chapter not found</h3>
                    <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general mb-6`}>
                        The chapter you're looking for doesn't exist or has been removed.
                    </p>
                    <Link to="/study-hub">
                        <Button variant="primary">
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Study Hub
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    // Fallback formula book
    const displayFormulaBook = formulaBook || {
        id: `fb-${chapter.subject?.toLowerCase()}`,
        title: `${chapter.subject} Complete Formula Book`,
        subject: chapter.subject,
        page_count: chapter.subject === 'Maths' ? 85 : chapter.subject === 'Physics' ? 120 : 95,
        file_url: '#',
    };

    const subjectColors = {
        Physics: {
            badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
        },
        Chemistry: {
            badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-400',
        },
        Maths: {
            badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            iconBg: 'bg-orange-500/10',
            iconColor: 'text-orange-400',
        },
    };

    const colors = subjectColors[chapter.subject] || subjectColors.Physics;

    const tabs = [
        { id: 'videos', label: 'Videos', icon: Video, count: videos.length },
        { id: 'notes', label: 'Notes', icon: FileText },
        { id: 'formulas', label: 'Formula Sheet', icon: BookOpen },
        { id: 'practice', label: 'Practice', icon: ClipboardList, count: practiceQuestions.length },
    ];

    const activeVideo = videos.find(v => v.id === activeVideoId) || videos[0];

    const handleVideoPlay = (video) => {
        setActiveVideoId(video.id);
    };

    const handleVideoProgress = async (videoId, percentage) => {
        if (!userId || !chapterId || !videoId) {
            return;
        }

        try {

            // Update progress in real-time
            await updateVideoProgress(userId, videoId, percentage);

            // If video is 90% watched, mark as complete
            if (percentage >= 90) {
                const updatedProgress = await markVideoAsWatched(userId, videoId, chapterId);
                if (updatedProgress) {
                    // Update chapter state with new progress
                    setChapter(prev => ({
                        ...prev,
                        progress: updatedProgress.progress,
                        completedTopics: updatedProgress.completedTopics,
                    }));
                    // Track video watched activity for heatmap
                    recordVideoWatched();
                    // Check if chapter is 100% complete
                    if (updatedProgress.progress >= 100) {
                        recordChapterCompleted();
                    }
                }
            }
        } catch (error) {
            console.error('Error updating video progress:', error);
        }
    };

    // Helper: trigger file download for any URL (Supabase or Google Drive)
    const triggerFileDownload = (url, filename) => {
        try {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            if (filename) link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // Fallback to window.open
            window.open(url, '_blank');
        }
    };

    const handleFormulaDownload = async () => {
        if (displayFormulaBook.file_url && displayFormulaBook.file_url !== '#') {
            triggerFileDownload(displayFormulaBook.file_url, `${chapter?.subject || 'Formula'}_Formulas.pdf`);

            // Track formula view for progress (URL-independent — only updates DB flag)
            if (userId && chapterId) {
                const updatedProgress = await markFormulaViewed(userId, chapterId);
                if (updatedProgress) {
                    setChapter(prev => ({
                        ...prev,
                        progress: updatedProgress.progress,
                        completedTopics: updatedProgress.completedTopics,
                    }));
                }
            }
            // Track download activity for heatmap
            recordDownload();
        } else {
            alert('Formula book will be available soon!');
        }
    };

    const getGoogleDrivePreviewUrl = (url) => {
        if (!url) return url;
        // Extract file ID from Google Drive download URL
        const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        // Handle /file/d/ID/ format
        const match2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match2) {
            return `https://drive.google.com/file/d/${match2[1]}/preview`;
        }
        return url;
    };

    const handleNotePreview = (note) => {
        if (note.file_url) {
            const previewUrl = getGoogleDrivePreviewUrl(note.file_url);
            window.open(previewUrl, '_blank');
        }
    };

    const handleNoteDownload = async (note) => {
        if (note.file_url) {
            triggerFileDownload(note.file_url, note.title ? `${note.title}.pdf` : undefined);

            // Track note download for progress (URL-independent — only updates DB flag)
            if (userId && chapterId) {
                const updatedProgress = await markNotesDownloaded(userId, chapterId);
                if (updatedProgress) {
                    setChapter(prev => ({
                        ...prev,
                        progress: updatedProgress.progress,
                        completedTopics: updatedProgress.completedTopics,
                    }));
                }
            }
            // Track download activity for heatmap
            recordDownload();
        }
    };

    // Practice Quiz Functions
    const startQuiz = () => {
        setQuizMode(true);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
    };

    const handleAnswerSelect = (questionId, answer) => {
        if (quizSubmitted) return;
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handleSubmitQuiz = async () => {
        if (quizSubmitted || submittingQuiz) {
            return;
        }

        setSubmittingQuiz(true);

        try {
            // Calculate score
            let correct = 0;
            practiceQuestions.forEach(q => {
                if (selectedAnswers[q.id] === q.correct_answer) {
                    correct++;
                }
            });

            const score = Math.round((correct / practiceQuestions.length) * 100);

            setQuizScore({ correct, total: practiceQuestions.length, percentage: score });
            setQuizSubmitted(true);

            // Update progress in database if user is logged in
            if (userId && chapterId) {
                try {
                    // ✅ FIX 1: INSERT INTO user_practice_attempts table
                    const { data: attemptData, error: attemptError } = await supabase
                        .from('user_practice_attempts')
                        .insert({
                            user_id: userId,
                            chapter_id: chapterId,
                            score: correct,  // Number of correct answers
                            total_questions: practiceQuestions.length,
                            time_taken_seconds: 0,  // You can add timer if you want
                            answers: selectedAnswers,  // Store user's answers
                            attempted_at: new Date().toISOString(),
                        })
                        .select()
                        .single();

                    if (attemptError) {
                        console.error('Error saving test attempt:', attemptError);
                    }

                    // ✅ FIX 2: Update user_chapter_progress table
                    const currentProgress = chapter?.progress || 0;
                    const newProgress = Math.min(100, currentProgress + 40);

                    const { error: progressError } = await supabase
                        .from('user_chapter_progress')
                        .upsert({
                            user_id: userId,
                            chapter_id: chapterId,
                            practice_completed: true,
                            practice_attempted: true,
                            practice_score: score,
                            updated_at: new Date().toISOString(),
                        }, {
                            onConflict: 'user_id,chapter_id',
                        });

                    if (progressError) {
                        console.error('Error updating progress:', progressError);
                    }

                    // Track activity for heatmap
                    recordTestCompletion(practiceQuestions.length);

                    // Update daily challenge progress if applicable
                    try {
                        const todayChallenge = await getTodayChallenge();
                        if (todayChallenge && todayChallenge.challenge_type === 'questions') {
                            await incrementChallengeProgress(userId, todayChallenge.id, practiceQuestions.length);
                        }
                    } catch (challengeErr) {
                        console.error('Error updating challenge:', challengeErr);
                    }
                } catch (dbErr) {
                    console.error('Database error:', dbErr);
                }
            }

            // Update progress in UI immediately
            const currentProgress = chapter?.progress || 0;
            const newProgress = Math.min(100, currentProgress + 40);

            setChapter(prev => ({
                ...prev,
                progress: newProgress,
                completedTopics: Math.floor((newProgress / 100) * 10),
            }));

            // Mark test as completed
            setTestCompleted(true);
            setBestTestScore(score);
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Failed to submit quiz. Please try again.');
        } finally {
            setSubmittingQuiz(false);
        }
    };

    const resetQuiz = () => {
        setQuizMode(false);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
    };

    // Calculate chapter progress
    const watchedVideos = videos.filter(v => v.status === 'watched').length;
    const totalDuration = videos.reduce((acc, v) => {
        // Handle duration_seconds from database
        if (v.duration_seconds) {
            return acc + Math.floor(v.duration_seconds / 3600); // Convert seconds to hours
        }
        // Fallback: parse duration string like "60:00" or "1:30:00"
        if (v.duration && typeof v.duration === 'string') {
            const parts = v.duration.split(':').map(Number);
            if (parts.length === 3) {
                // Format: HH:MM:SS
                return acc + parts[0];
            } else if (parts.length === 2) {
                // Format: MM:SS
                return acc + Math.floor(parts[0] / 60);
            }
        }
        return acc;
    }, 0);

    return (
        <div className="container mx-auto px-6 py-8 pt-32 min-h-screen">
            {/* Back Link */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6"
            >
                <Link
                    to="/study-hub"
                    className={`inline-flex items-center gap-2 ${isDark ? 'text-white/50' : 'text-gray-500'} hover:text-brand transition-colors font-general group`}
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Study Hub
                </Link>
            </motion.div>

            {/* Chapter Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold font-general border ${colors.badge}`}>
                        {chapter.subject}
                    </span>
                    <span className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm font-general`}>
                        Class {chapter.class}
                    </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">
                    {chapter.title}
                </h1>
                <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general max-w-2xl mb-4`}>
                    {chapter.description || `Complete ${chapter.title} chapter for MHT-CET preparation.`}
                </p>
                <div className={`flex flex-wrap items-center gap-6 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general`}>
                    <span className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-brand" />
                        {watchedVideos}/{videos.length} Videos Watched
                    </span>
                    <span className="flex items-center gap-2">
                        <Clock size={16} />
                        ~{totalDuration > 0 ? totalDuration : Math.ceil(videos.length * 1)} hours of content
                    </span>
                    <div className="w-32">
                        <ProgressBar percentage={chapter.progress || 0} showLabel={false} size="sm" />
                    </div>
                    <span className="font-mono text-brand">{chapter.progress || 0}%</span>
                </div>
            </motion.div>

            {/* Sub-tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`flex flex-wrap gap-2 mb-8 p-1.5 ${isDark ? 'bg-dark-card/30 border-white/5' : 'bg-gray-100 border-gray-200'} rounded-xl border w-fit`}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all font-general flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-brand text-white shadow-lg shadow-brand/25'
                            : isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === tab.id ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {/* VIDEOS TAB */}
                {activeTab === 'videos' && (
                    <motion.div
                        key="videos"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {loadingVideos ? (
                            <div className="lg:col-span-3 flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                            </div>
                        ) : videos.length > 0 ? (
                            <>
                                {/* Video Player */}
                                <div className="lg:col-span-2 space-y-4">
                                    <VideoPlayer
                                        videoId={activeVideo?.video_id || getYouTubeVideoId(activeVideo?.video_url)}
                                        title={activeVideo?.title}
                                        onProgress={(percentage) => handleVideoProgress(activeVideo?.id, percentage)}
                                    />
                                    <div className="p-4">
                                        <h3 className="text-xl font-heading font-bold mb-2">
                                            {activeVideo?.title}
                                        </h3>
                                        <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general text-sm`}>
                                            Duration: {activeVideo?.duration || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Video Playlist */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                                        <Video size={18} className="text-brand" />
                                        Video Playlist
                                    </h3>
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {videos.map((video, i) => (
                                            <VideoListItem
                                                key={video.id}
                                                video={{
                                                    ...video,
                                                    videoId: video.video_id || getYouTubeVideoId(video.video_url),
                                                }}
                                                index={i}
                                                isActive={activeVideo?.id === video.id}
                                                onPlay={handleVideoPlay}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Card className="lg:col-span-3 p-12 text-center">
                                <Video className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={64} />
                                <h3 className="text-xl font-heading font-bold mb-2">No videos available</h3>
                                <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general`}>
                                    Videos for this chapter will be added soon.
                                </p>
                            </Card>
                        )}
                    </motion.div>
                )}

                {/* NOTES TAB - Admin Curated Notes Only */}
                {activeTab === 'notes' && (
                    <motion.div
                        key="notes"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-3">
                            <FileText className="text-brand" size={24} />
                            Chapter Notes (Curated)
                        </h2>

                        {loadingNotes ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                            </div>
                        ) : chapterNotes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {chapterNotes.map((note, i) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card className="p-6 h-full flex flex-col">
                                            <div className="w-16 h-20 mx-auto mb-4 bg-red-500/10 rounded-lg flex items-center justify-center">
                                                <FileText size={32} className="text-red-400" />
                                            </div>

                                            <h4 className="font-heading font-bold text-lg mb-2 text-center">
                                                {note.title}
                                            </h4>

                                            <div className={`flex items-center justify-center gap-3 text-xs ${isDark ? 'text-white/50' : 'text-gray-500'} font-general mb-4`}>
                                                {note.page_count && <span>{note.page_count} pages</span>}
                                                {note.note_type && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="capitalize">{note.note_type}</span>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mt-auto">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleNotePreview(note)}
                                                >
                                                    <Eye size={14} className="mr-1" />
                                                    Preview
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleNoteDownload(note)}
                                                >
                                                    <Download size={14} className="mr-1" />
                                                    Download
                                                </Button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <Card className="p-12 text-center max-w-lg">
                                <FileText className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={64} />
                                <h3 className="text-xl font-heading font-bold mb-2">No notes available yet</h3>
                                <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general mb-4`}>
                                    Curated notes for this chapter will be added soon.
                                </p>
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10 text-left">
                                    <Lightbulb className="text-brand flex-shrink-0 mt-0.5" size={18} />
                                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general`}>
                                        Upload your own notes in the main Study Hub → Notes tab!
                                    </p>
                                </div>
                            </Card>
                        )}
                    </motion.div>
                )}

                {/* FORMULA SHEET TAB */}
                {activeTab === 'formulas' && (
                    <motion.div
                        key="formulas"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-2xl"
                    >
                        <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-3">
                            <BookOpen className="text-brand" size={24} />
                            Complete {chapter.subject} Formula Book
                        </h2>

                        <Card className="p-8">
                            <div className="flex flex-col items-center text-center">
                                <div className={`p-6 rounded-2xl ${colors.iconBg} mb-6`}>
                                    <BookOpen size={64} className={colors.iconColor} />
                                </div>

                                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold font-general border mb-4 ${colors.badge}`}>
                                    {chapter.subject?.toUpperCase()}
                                </span>

                                <h3 className="text-2xl font-heading font-bold text-brand mb-3">
                                    {displayFormulaBook.title}
                                </h3>

                                <p className={`${isDark ? 'text-white/70' : 'text-gray-600'} font-general mb-6 max-w-md`}>
                                    Complete formula compilation for {chapter.subject} (11th + 12th).
                                    All chapters covered with important derivations and quick revision notes.
                                </p>

                                <div className={`flex items-center gap-4 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'} font-general mb-8`}>
                                    <span className="flex items-center gap-1.5">
                                        <FileText size={14} />
                                        {displayFormulaBook.page_count} pages
                                    </span>
                                    <span>•</span>
                                    <span>Complete 11th + 12th</span>
                                </div>

                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full max-w-xs"
                                    onClick={handleFormulaDownload}
                                >
                                    <Download size={20} className="mr-2" />
                                    Download PDF
                                </Button>
                            </div>
                        </Card>

                        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
                            <Lightbulb className="text-brand flex-shrink-0 mt-0.5" size={18} />
                            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general`}>
                                This formula book covers ALL {chapter.subject} chapters from 11th and 12th standard.
                                Use it for quick revision before exams!
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* PRACTICE TAB */}
                {activeTab === 'practice' && (
                    <motion.div
                        key="practice"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {loadingQuestions ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                            </div>
                        ) : !quizMode ? (
                            <>
                                {/* START SCREEN - Practice Test Card */}
                                <Card className="p-8 max-w-2xl">
                                    <div className="flex items-start gap-4">
                                        <div className="p-4 rounded-xl bg-brand/10">
                                            <ClipboardList size={32} className="text-brand" />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-heading font-bold mb-2">
                                                Practice Test - {chapter.title}
                                            </h3>
                                            <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general mb-4`}>
                                                Test your understanding with MCQs from previous years and
                                                practice problems designed for this chapter.
                                            </p>
                                            <div className={`flex flex-wrap gap-3 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general mb-6`}>
                                                <span>{practiceQuestions.length} Questions</span>
                                                <span>•</span>
                                                <span>{Math.ceil(practiceQuestions.length * 1.5)} Minutes</span>
                                                <span>•</span>
                                                <span>MHT-CET Pattern</span>
                                            </div>
                                            {testCompleted && !quizMode ? (
                                                <div className="space-y-4">
                                                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle2 size={24} className="text-green-500" />
                                                            <div>
                                                                <p className="font-heading font-bold text-green-500">
                                                                    Test Completed: {bestTestScore}%
                                                                </p>
                                                                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general`}>
                                                                    Your best score across all attempts
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="secondary" size="lg" onClick={startQuiz}>
                                                        <RefreshCw size={18} className="mr-2" />
                                                        Try Again
                                                    </Button>
                                                </div>
                                            ) : practiceQuestions.length > 0 && !quizMode ? (
                                                <Button variant="primary" size="lg" onClick={startQuiz}>
                                                    <Play size={18} className="mr-2" />
                                                    Start Practice Test
                                                </Button>
                                            ) : !quizMode ? (
                                                <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} font-general`}>
                                                    Questions will be available soon.
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                </Card>

                            </>
                        ) : (
                            /* QUIZ MODE - TWO COLUMN LAYOUT */
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* LEFT COLUMN - Question (2/3 width) */}
                                <div className="lg:col-span-2 space-y-6">
                                    {!quizSubmitted ? (
                                        <>
                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className={`flex justify-between text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general mb-2`}>
                                                    <span>Question {currentQuestionIndex + 1} of {practiceQuestions.length}</span>
                                                    <span>{Object.keys(selectedAnswers).length} answered</span>
                                                </div>
                                                <div className={`h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                                                    <div
                                                        className="h-full bg-brand transition-all"
                                                        style={{ width: `${((currentQuestionIndex + 1) / practiceQuestions.length) * 100}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Current Question */}
                                            <Card className="p-6">
                                                <h3 className="text-lg font-heading font-bold mb-6">
                                                    Q{currentQuestionIndex + 1}. {practiceQuestions[currentQuestionIndex]?.question_text}
                                                </h3>

                                                <div className="space-y-3">
                                                    {['a', 'b', 'c', 'd'].map((option) => {
                                                        const q = practiceQuestions[currentQuestionIndex];
                                                        const optionText = q?.[`option_${option}`];
                                                        const isSelected = selectedAnswers[q?.id] === option;

                                                        return (
                                                            <button
                                                                key={option}
                                                                onClick={() => handleAnswerSelect(q.id, option)}
                                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected
                                                                    ? 'border-brand bg-brand/10'
                                                                    : isDark ? 'border-white/10 hover:border-white/30 bg-white/5' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                                                                    }`}
                                                            >
                                                                <span className={`font-general ${isSelected ? 'text-brand' : isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                                                    <span className="font-bold uppercase mr-3">{option}.</span>
                                                                    {optionText}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </Card>

                                            {/* Navigation */}
                                            <div className="flex justify-between">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                                    disabled={currentQuestionIndex === 0}
                                                >
                                                    Previous
                                                </Button>

                                                {currentQuestionIndex === practiceQuestions.length - 1 ? (
                                                    <>
                                                        <Button
                                                            variant="primary"
                                                            onClick={handleSubmitQuiz}
                                                            disabled={Object.keys(selectedAnswers).length !== practiceQuestions.length || submittingQuiz}
                                                        >
                                                            {submittingQuiz ? (
                                                                <>
                                                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                                                    Submitting...
                                                                </>
                                                            ) : (
                                                                'Submit Quiz'
                                                            )}
                                                        </Button>
                                                        {/* Debug: Show button state */}
                                                        <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                            Answered: {Object.keys(selectedAnswers).length}/{practiceQuestions.length}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(practiceQuestions.length - 1, prev + 1))}
                                                    >
                                                        Next
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        /* AFTER SUBMISSION - Show Question Review */
                                        <>
                                            {/* Question Review with Answer Status */}
                                            <Card className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <h3 className="text-lg font-heading font-bold">
                                                        Q{currentQuestionIndex + 1}. {practiceQuestions[currentQuestionIndex]?.question_text}
                                                    </h3>
                                                    {selectedAnswers[practiceQuestions[currentQuestionIndex]?.id] === practiceQuestions[currentQuestionIndex]?.correct_answer ? (
                                                        <span className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                                                            <CheckCircle2 size={16} />
                                                            Correct
                                                        </span>
                                                    ) : selectedAnswers[practiceQuestions[currentQuestionIndex]?.id] ? (
                                                        <span className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                                                            <XCircle size={16} />
                                                            Wrong
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-gray-400 text-sm font-semibold">
                                                            <AlertCircle size={16} />
                                                            Skipped
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-3">
                                                    {['a', 'b', 'c', 'd'].map((option) => {
                                                        const q = practiceQuestions[currentQuestionIndex];
                                                        const optionText = q?.[`option_${option}`];
                                                        const isCorrect = option === q?.correct_answer;
                                                        const isUserAnswer = selectedAnswers[q?.id] === option;

                                                        return (
                                                            <div
                                                                key={option}
                                                                className={`p-4 rounded-xl border-2 ${isCorrect
                                                                    ? 'border-green-500 bg-green-500/10'
                                                                    : isUserAnswer
                                                                        ? 'border-red-500 bg-red-500/10'
                                                                        : isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                                                                    }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <span className={`font-bold uppercase ${isCorrect ? 'text-green-400' :
                                                                        isUserAnswer ? 'text-red-400' : isDark ? 'text-white/60' : 'text-gray-500'
                                                                        }`}>
                                                                        {option}.
                                                                    </span>
                                                                    <div className="flex-1">
                                                                        <p className={`font-general ${isCorrect ? 'text-green-400' :
                                                                            isUserAnswer ? 'text-red-400' : isDark ? 'text-white/80' : 'text-gray-700'
                                                                            }`}>
                                                                            {optionText}
                                                                        </p>
                                                                        {isCorrect && (
                                                                            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                                                                <CheckCircle2 size={12} />
                                                                                Correct Answer
                                                                            </p>
                                                                        )}
                                                                        {isUserAnswer && !isCorrect && (
                                                                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                                                                <XCircle size={12} />
                                                                                Your Answer
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Explanation */}
                                                {practiceQuestions[currentQuestionIndex]?.explanation && (
                                                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                        <div className="flex items-start gap-2">
                                                            <Lightbulb size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-sm font-semibold text-blue-400 mb-1">Explanation</p>
                                                                <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'} font-general`}>
                                                                    {practiceQuestions[currentQuestionIndex].explanation}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Card>

                                            {/* Navigation After Submit */}
                                            <div className="flex justify-between">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                                    disabled={currentQuestionIndex === 0}
                                                >
                                                    Previous
                                                </Button>

                                                {currentQuestionIndex < practiceQuestions.length - 1 ? (
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                                    >
                                                        Next
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={resetQuiz}
                                                    >
                                                        <RefreshCw size={16} className="mr-2" />
                                                        Try Again
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* RIGHT COLUMN - Results Summary (1/3 width) */}
                                <div className="space-y-4">
                                    {quizSubmitted && quizScore ? (
                                        <>
                                            {/* Score Card */}
                                            <Card className="p-6 text-center sticky top-24">
                                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${quizScore.percentage >= 70 ? 'bg-green-500/20' :
                                                    quizScore.percentage >= 40 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                                                    }`}>
                                                    <span className={`text-3xl font-heading font-bold ${quizScore.percentage >= 70 ? 'text-green-400' :
                                                        quizScore.percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>
                                                        {quizScore.percentage}%
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-heading font-bold mb-2">
                                                    {quizScore.percentage >= 70 ? 'Great Job! 🎉' :
                                                        quizScore.percentage >= 40 ? 'Good Effort! 💪' : 'Keep Practicing! 📚'}
                                                </h3>

                                                <p className={`${isDark ? 'text-white/60' : 'text-gray-500'} font-general text-sm mb-6`}>
                                                    You got {quizScore.correct} out of {quizScore.total} questions correct.
                                                </p>

                                                {/* Stats Breakdown */}
                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                                                        <span className="flex items-center gap-2 text-green-400 text-sm">
                                                            <CheckCircle2 size={16} />
                                                            Correct
                                                        </span>
                                                        <span className="font-bold text-green-400">{quizScore.correct}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                                                        <span className="flex items-center gap-2 text-red-400 text-sm">
                                                            <XCircle size={16} />
                                                            Wrong
                                                        </span>
                                                        <span className="font-bold text-red-400">{quizScore.total - quizScore.correct}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-gray-500/10 rounded-lg">
                                                        <span className="flex items-center gap-2 text-gray-400 text-sm">
                                                            <AlertCircle size={16} />
                                                            Unattempted
                                                        </span>
                                                        <span className="font-bold text-gray-400">
                                                            {practiceQuestions.length - Object.keys(selectedAnswers).length}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="space-y-2">
                                                    <Button
                                                        variant="primary"
                                                        className="w-full"
                                                        onClick={resetQuiz}
                                                    >
                                                        <RefreshCw size={16} className="mr-2" />
                                                        Try Again
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        className="w-full"
                                                        onClick={() => setActiveTab('videos')}
                                                    >
                                                        Review Chapter
                                                    </Button>
                                                </div>
                                            </Card>

                                            {/* Question Navigation Grid */}
                                            <Card className="p-4">
                                                <h4 className="text-sm font-heading font-bold mb-3">Quick Navigation</h4>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {practiceQuestions.map((q, idx) => {
                                                        const isCorrect = selectedAnswers[q.id] === q.correct_answer;
                                                        const isAnswered = selectedAnswers[q.id] !== undefined;
                                                        const isCurrent = idx === currentQuestionIndex;

                                                        return (
                                                            <button
                                                                key={q.id}
                                                                onClick={() => setCurrentQuestionIndex(idx)}
                                                                className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${isCurrent ? 'ring-2 ring-brand scale-110' : ''
                                                                    } ${!isAnswered ? 'bg-gray-600 text-gray-300' :
                                                                        isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                                    }`}
                                                            >
                                                                {idx + 1}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
                                        </>
                                    ) : (
                                        /* Before Submission - Show Instructions */
                                        <Card className="p-6 sticky top-24">
                                            <h4 className="text-lg font-heading font-bold mb-4">Instructions</h4>
                                            <ul className={`space-y-3 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general`}>
                                                <li className="flex items-start gap-2">
                                                    <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-brand" />
                                                    <span>Answer all questions before submitting</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <Clock size={16} className="flex-shrink-0 mt-0.5 text-brand" />
                                                    <span>Recommended time: {Math.ceil(practiceQuestions.length * 1.5)} minutes</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <Lightbulb size={16} className="flex-shrink-0 mt-0.5 text-brand" />
                                                    <span>Review answers after submission</span>
                                                </li>
                                            </ul>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChapterDetail;
