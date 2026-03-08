import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Timer, ChevronRight, AlertCircle, Flag, Trash2, AlertTriangle, XCircle, Clock, BookOpen, Shield } from 'lucide-react';
import { recordTestCompletion } from '../lib/activityTracker';
import { useTheme } from '../contexts/ThemeContext';

// Proctoring imports
import { initializeProctoring, startProctoring, stopProctoring, disposeProctoring, reportTabSwitch, getProctoringStatus, pauseProctoring, resumeProctoring } from '../lib/proctoring/proctoringService';
import ProctoringSetup from '../components/proctoring/ProctoringSetup';
import ProctoringIndicator from '../components/proctoring/ProctoringIndicator';
import ViolationAlert from '../components/proctoring/ViolationAlert';
import CameraPreview from '../components/proctoring/CameraPreview';

const TestEngine = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // Core State
    const [sections, setSections] = useState([]);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [visitedQuestions, setVisitedQuestions] = useState(new Set());

    // Pre-Test State
    const [hasStarted, setHasStarted] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Security State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showTransitionModal, setShowTransitionModal] = useState(false);
    const [transitionMessage, setTransitionMessage] = useState('');
    const [countdown, setCountdown] = useState(3);

    const answersRef = useRef({});
    const countdownTimerRef = useRef(null);

    // Submission State
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Proctoring State
    const [showProctoringSetup, setShowProctoringSetup] = useState(false);
    const [proctoringEnabled, setProctoringEnabled] = useState(false);
    const [proctoringStatus, setProctoringStatus] = useState('idle'); // idle, monitoring, paused, warning, error
    const [proctoringStrikes, setProctoringStrikes] = useState(0);
    const [proctoringCapabilities, setProctoringCapabilities] = useState({});
    const [proctoringSession, setProctoringSession] = useState(null);
    const [mediaStream, setMediaStream] = useState(null);
    const [showViolationAlert, setShowViolationAlert] = useState(false);
    const [currentViolation, setCurrentViolation] = useState(null);
    const [currentViolationResult, setCurrentViolationResult] = useState(null);
    const proctoringVideoRef = useRef(null);

    // Cleanup countdown timer and proctoring on unmount
    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            disposeProctoring();
        };
    }, []);

    // 1. Fetch Sections on Mount
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const { data, error } = await supabase
                    .from('sections')
                    .select('*')
                    .eq('test_id', testId)
                    .order('order_index', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    setSections(data);
                    setTimeLeft(data[0].duration_mins * 60);
                    setLoading(false);
                } else {
                    console.error("No sections found for this test ID.");
                    navigate('/mock-tests');
                }
            } catch (error) {
                console.error('Error fetching sections:', error);
                navigate('/mock-tests');
            }
        };

        fetchSections();
    }, [testId, navigate]);

    // 2. Fetch Questions when Section Changes
    useEffect(() => {
        const fetchQuestions = async () => {
            if (sections.length > 0 && hasStarted) {
                try {
                    const currentSection = sections[activeSectionIndex];

                    const { data, error } = await supabase
                        .from('questions')
                        .select('*')
                        .eq('section_id', currentSection.id)
                        .order('id', { ascending: true });

                    if (error) throw error;

                    setQuestions(data || []);
                    setCurrentQuestionIndex(0);
                } catch (error) {
                    console.error('Error fetching questions:', error);
                }
            }
        };

        fetchQuestions();
    }, [activeSectionIndex, sections, hasStarted]);

    // Keep answersRef in sync with answers state
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    // 3. Mark current question as visited
    useEffect(() => {
        if (questions.length > 0 && hasStarted) {
            const currentQuestionId = questions[currentQuestionIndex]?.id;
            if (currentQuestionId) {
                setVisitedQuestions(prev => new Set([...prev, currentQuestionId]));
            }
        }
    }, [currentQuestionIndex, questions, hasStarted]);

    // 4. Fullscreen Guard
    useEffect(() => {
        if (!hasStarted) return;

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [hasStarted]);

    // 5. Tab Switch Detection
    useEffect(() => {
        if (!hasStarted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Report to proctoring system
                if (proctoringEnabled) {
                    reportTabSwitch();
                }

                setViolationCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 2) {
                        // Use a small timeout so React state settles before submitting
                        setTimeout(() => {
                            handleAutoSubmit(answersRef.current);
                        }, 300);
                    } else {
                        setShowWarningModal(true);
                    }
                    return newCount;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [hasStarted]); // eslint-disable-line react-hooks/exhaustive-deps

    // 6. Timer Logic
    useEffect(() => {
        if (!hasStarted || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleSectionSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, hasStarted]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleProceedToTest = () => {
        if (!acceptedTerms) return;
        // Show proctoring setup first
        setShowProctoringSetup(true);
    };

    // Called when proctoring setup is complete
    const handleProctoringSetupComplete = async (stream) => {
        setMediaStream(stream);
        setShowProctoringSetup(false);

        // Enter fullscreen
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (err) {
            console.warn('Fullscreen request failed:', err);
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (user && stream) {
            // Initialize proctoring system
            const result = await initializeProctoring({
                userId: user.id,
                testId: parseInt(testId),
                videoElement: proctoringVideoRef.current,
                onViolation: handleProctoringViolation,
                onTerminate: handleProctoringTerminate,
                onStatusChange: (status) => setProctoringStatus(status),
                onProgress: () => {}
            });

            if (result.success) {
                setProctoringEnabled(true);
                setProctoringSession(result.session);
                setProctoringCapabilities(result.capabilities || {});

                // Start monitoring after a short delay to let video elements settle
                setTimeout(() => {
                    startProctoring(proctoringVideoRef.current);
                }, 1000);
            }
        }

        setHasStarted(true);
    };

    // Called when user skips proctoring
    const handleSkipProctoring = () => {
        setShowProctoringSetup(false);

        document.documentElement.requestFullscreen()
            .then(() => {
                setHasStarted(true);
                setIsFullscreen(true);
            })
            .catch(err => {
                console.warn('Fullscreen request failed:', err);
                setHasStarted(true);
            });
    };

    // Handle proctoring violation
    const handleProctoringViolation = (violation, result) => {
        setProctoringStrikes(result.strikeCount);
        setCurrentViolation(violation);
        setCurrentViolationResult(result);
        setShowViolationAlert(true);

        if (result.action === 'alert') {
            setProctoringStatus('warning');
        }
    };

    // Handle proctoring termination (auto-submit)
    const handleProctoringTerminate = () => {
        setTimeout(() => {
            handleAutoSubmit(answersRef.current);
        }, 2000);
    };

    // Dismiss violation alert
    const handleDismissViolation = () => {
        setShowViolationAlert(false);
        setProctoringStatus('monitoring');
    };

    const handleSectionSubmit = useCallback(() => {
        if (activeSectionIndex < sections.length - 1) {
            const currentSectionName = sections[activeSectionIndex]?.name || 'Section';
            const nextSection = sections[activeSectionIndex + 1];
            const nextSectionName = nextSection?.name || 'Next Section';

            setTransitionMessage(`${currentSectionName} Completed. Starting ${nextSectionName} in 3 seconds...`);
            setShowTransitionModal(true);
            setCountdown(3);

            let count = 3;
            // Clear any existing countdown timer
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = setInterval(() => {
                count -= 1;
                setCountdown(count);
                if (count <= 0) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    setShowTransitionModal(false);
                    setActiveSectionIndex(prev => prev + 1);
                    setTimeLeft(nextSection.duration_mins * 60);
                }
            }, 1000);
        } else {
            setShowSubmitModal(true);
        }
    }, [activeSectionIndex, sections]);

    // Auto-submit called from visibilitychange (uses ref to avoid stale closure)
    const handleAutoSubmit = async (currentAnswers) => {
        setIsSubmitting(true);

        // Stop proctoring
        if (proctoringEnabled) {
            await stopProctoring('terminated');
        }

        let score = 0;
        let maxScore = 0;
        const answersWithCorrectness = {};

        for (const section of sections) {
            const { data: sectionQuestions } = await supabase
                .from('questions')
                .select('*')
                .eq('section_id', section.id);

            if (sectionQuestions) {
                sectionQuestions.forEach(q => {
                    const marks = q.marks || 2;
                    maxScore += marks;

                    const userAnswerText = currentAnswers[q.id]?.answer;

                    const options = Array.isArray(q.options) ? q.options :
                        (typeof q.options === 'string' ? JSON.parse(q.options) : []);
                    const letterMap = ['A', 'B', 'C', 'D'];
                    const userAnswerLetter = userAnswerText
                        ? letterMap[options.indexOf(userAnswerText)] || null
                        : null;

                    const isCorrect = userAnswerLetter === q.correct_option;

                    if (isCorrect) {
                        score += marks;
                    }

                    if (currentAnswers[q.id]) {
                        answersWithCorrectness[q.id] = {
                            answer: userAnswerLetter,
                            isCorrect: isCorrect
                        };
                    }
                });
            }
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('User authentication error:', userError);
            setIsSubmitting(false);
            if (document.fullscreenElement) await document.exitFullscreen();
            navigate('/mock-tests');
            return;
        }

        try {
            const { data: submission, error: submissionError } = await supabase
                .from('submissions')
                .insert({
                    user_id: user.id,
                    test_id: parseInt(testId),
                    score: score,
                    max_score: maxScore,
                    answers: answersWithCorrectness
                })
                .select()
                .single();

            if (submissionError) throw submissionError;

            // Track test completion activity — only count actually answered questions
            recordTestCompletion(Object.keys(answersWithCorrectness).length);

            if (document.fullscreenElement) await document.exitFullscreen();
            navigate(`/result/${submission.id}`);

        } catch (error) {
            console.error('❌ Auto-submit failed:', error);
            setIsSubmitting(false);
            if (document.fullscreenElement) await document.exitFullscreen();
            navigate('/mock-tests');
        }
    };

    // Normal submit (called from Confirm Submit button)
    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        setShowSubmitModal(false);

        // Stop proctoring
        if (proctoringEnabled) {
            await stopProctoring('completed');
        }

        const currentAnswers = answersRef.current;

        let score = 0;
        let maxScore = 0;
        const answersWithCorrectness = {};

        for (const section of sections) {
            const { data: sectionQuestions } = await supabase
                .from('questions')
                .select('*')
                .eq('section_id', section.id);

            if (sectionQuestions) {
                sectionQuestions.forEach(q => {
                    const marks = q.marks || 2;
                    maxScore += marks;

                    const userAnswerText = currentAnswers[q.id]?.answer;

                    const options = Array.isArray(q.options) ? q.options :
                        (typeof q.options === 'string' ? JSON.parse(q.options) : []);
                    const letterMap = ['A', 'B', 'C', 'D'];
                    const userAnswerLetter = userAnswerText
                        ? letterMap[options.indexOf(userAnswerText)] || null
                        : null;

                    const isCorrect = userAnswerLetter === q.correct_option;

                    if (isCorrect) {
                        score += marks;
                    }

                    if (currentAnswers[q.id]) {
                        answersWithCorrectness[q.id] = {
                            answer: userAnswerLetter,
                            isCorrect: isCorrect
                        };
                    }
                });
            }
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('User authentication error:', userError);
            setIsSubmitting(false);
            if (document.fullscreenElement) await document.exitFullscreen();
            navigate('/mock-tests');
            return;
        }

        try {
            const { data: submission, error: submissionError } = await supabase
                .from('submissions')
                .insert({
                    user_id: user.id,
                    test_id: parseInt(testId),
                    score: score,
                    max_score: maxScore,
                    answers: answersWithCorrectness
                })
                .select()
                .single();

            if (submissionError) throw submissionError;

            // Track test completion activity — only count actually answered questions
            recordTestCompletion(Object.keys(answersWithCorrectness).length);

            if (document.fullscreenElement) await document.exitFullscreen();
            navigate(`/result/${submission.id}`);

        } catch (error) {
            console.error('❌ Submission failed:', error);
            setIsSubmitting(false);
            if (document.fullscreenElement) await document.exitFullscreen();
            navigate('/mock-tests');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (option) => {
        const currentQuestion = questions[currentQuestionIndex];
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: {
                answer: option,
                markedForReview: prev[currentQuestion.id]?.markedForReview || false
            }
        }));
    };

    const handleClearResponse = () => {
        const currentQuestion = questions[currentQuestionIndex];
        setAnswers(prev => {
            const newAnswers = { ...prev };
            if (newAnswers[currentQuestion.id]) {
                newAnswers[currentQuestion.id] = {
                    answer: null,
                    markedForReview: newAnswers[currentQuestion.id].markedForReview || false
                };
            }
            return newAnswers;
        });
    };

    const handleMarkForReview = () => {
        const currentQuestion = questions[currentQuestionIndex];
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: {
                answer: prev[currentQuestion.id]?.answer || null,
                markedForReview: !(prev[currentQuestion.id]?.markedForReview || false)
            }
        }));
    };

    const handleSaveAndNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handleQuestionClick = (index) => {
        setCurrentQuestionIndex(index);
    };

    const getQuestionStatus = (question) => {
        const questionId = question.id;
        const answerData = answers[questionId];
        const isVisited = visitedQuestions.has(questionId);

        if (answerData?.markedForReview) {
            return 'review';
        } else if (answerData?.answer) {
            return 'answered';
        } else if (isVisited) {
            return 'not-answered';
        } else {
            return 'not-visited';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'not-visited': return 'bg-gray-400 hover:bg-gray-500';
            case 'not-answered': return 'bg-red-500 hover:bg-red-600';
            case 'answered': return 'bg-green-500 hover:bg-green-600';
            case 'review': return 'bg-purple-500 hover:bg-purple-600';
            default: return 'bg-gray-400 hover:bg-gray-500';
        }
    };

    const getOptions = (q) => {
        if (!q?.options) return [];
        if (typeof q.options === 'string') {
            try { return JSON.parse(q.options); } catch (e) { return []; }
        }
        return q.options;
    };

    // Loading State
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black">
                <div className="text-white text-xl animate-pulse">Loading Test Environment...</div>
            </div>
        );
    }



    // Pre-Test Instruction Screen
    if (!hasStarted) {
        return (
            <>
                {/* Proctoring Setup Modal */}
                {showProctoringSetup && (
                    <ProctoringSetup
                        onSetupComplete={handleProctoringSetupComplete}
                        onSkip={handleSkipProctoring}
                        isDark={true}
                    />
                )}

                <div className="fixed inset-0 z-[200] bg-black h-screen w-screen overflow-y-auto flex items-center justify-center p-4 text-white">
                <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[95vh]">

                    {/* Left Card: Information & Pattern */}
                    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-sm overflow-y-auto">
                        <div>
                            {/* Header */}
                            <div className="text-center mb-4">
                                <BookOpen className="w-10 h-10 mx-auto mb-2 text-teal-400" />
                                <h1 className="text-2xl font-bold text-white mb-1">MHT-CET Full Mock Test</h1>
                                <p className="text-gray-400 text-sm">Read all instructions carefully</p>
                            </div>

                            {/* Exam Pattern */}
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-teal-400 mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Exam Pattern
                                </h2>
                                <div className="space-y-2">
                                    {sections.map((section, idx) => (
                                        <div key={section.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                            <h3 className="font-bold text-base text-white mb-1">
                                                Section {idx + 1}: {section.name}
                                            </h3>
                                            <div className="text-sm text-gray-300 flex gap-4">
                                                <span>⏱️ {section.duration_mins} mins</span>
                                                <span>📝 {idx === 0 ? '1' : '2'} mark/Q</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Color Legend */}
                            <div>
                                <h2 className="text-lg font-bold text-teal-400 mb-2">Question Status Colors</h2>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                        <div className="w-5 h-5 rounded-full bg-gray-400 flex-shrink-0"></div>
                                        <span className="text-xs text-gray-300">Not Visited</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                        <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0"></div>
                                        <span className="text-xs text-gray-300">Answered</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                        <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0"></div>
                                        <span className="text-xs text-gray-300">Not Answered</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                        <div className="w-5 h-5 rounded-full bg-purple-500 flex-shrink-0"></div>
                                        <span className="text-xs text-gray-300">Review</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Card: Security Rules & Action */}
                    <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 flex flex-col justify-center gap-4 backdrop-blur-sm overflow-y-auto">
                        {/* Security Warning Header */}
                        <div className="text-center">
                            <Shield className="w-12 h-12 mx-auto mb-2 text-red-400" />
                            <h2 className="text-xl font-bold text-red-400 mb-1">Security Rules</h2>
                            <p className="text-gray-400 text-sm">Please read carefully before proceeding</p>
                        </div>

                        {/* Security Rules */}
                        <div className="bg-red-950/30 border-2 border-red-800 rounded-xl p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-white text-sm mb-1">Fullscreen is Mandatory</p>
                                    <p className="text-xs text-gray-300">
                                        The test must be taken in fullscreen mode. Exiting will pause your test.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-white text-sm mb-1">No Tab Switching</p>
                                    <p className="text-xs text-gray-300">
                                        1st violation: Warning. 2nd violation: Automatic test submission.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-white text-sm mb-1">Auto-Submit</p>
                                    <p className="text-xs text-gray-300">
                                        When time runs out, the section will automatically submit.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Shield className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-white text-sm mb-1">AI Proctoring</p>
                                    <p className="text-xs text-gray-300">
                                        Camera, microphone, and AI monitoring will be enabled. Phone usage, multiple people, and suspicious audio will be flagged. 3 strikes = auto-submit.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Terms Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="mt-0.5 w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 flex-shrink-0"
                            />
                            <span className="text-gray-200 text-sm">
                                I have read and understood all instructions, exam pattern, and security rules.
                                I am ready to begin the test.
                            </span>
                        </label>

                        {/* Proceed Button */}
                        <button
                            onClick={handleProceedToTest}
                            disabled={!acceptedTerms}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform ${acceptedTerms
                                ? 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-[1.02] shadow-lg shadow-teal-600/50'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {acceptedTerms ? '🚀 PROCEED TO TEST' : '⚠️ Accept terms to continue'}
                        </button>
                    </div>

                </div>
            </div>
            </>
        );
    }

    // Fullscreen Jail Overlay
    if (!isFullscreen && hasStarted) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center p-8">
                <AlertTriangle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
                <h1 className="text-3xl font-bold text-white mb-2">Test Paused</h1>
                <p className="text-gray-400 mb-8 max-w-md">
                    Fullscreen mode is required to take this test. You cannot proceed in windowed mode for security reasons.
                </p>
                <button
                    onClick={() => document.documentElement.requestFullscreen()}
                    className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all transform hover:scale-105"
                >
                    RESUME FULLSCREEN
                </button>
            </div>
        );
    }

    // No Questions State
    if (questions.length === 0 && hasStarted) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-black gap-4">
                <div className="text-white text-xl">No questions found in this section.</div>
                <button onClick={() => navigate('/mock-tests')} className="text-teal-400 hover:underline">
                    Return to Tests
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const currentSection = sections[activeSectionIndex];
    const currentAnswer = answers[currentQuestion?.id];
    const optionsList = getOptions(currentQuestion);
    const isLastSection = activeSectionIndex === sections.length - 1;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black text-white flex overflow-hidden font-sans">
                {/* Left Side - Question Area (75%) */}
                <div className="w-3/4 flex flex-col border-r border-gray-800">
                    {/* Header */}
                    <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold">Section: {currentSection?.name || 'General'}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Proctoring Indicator */}
                            {proctoringEnabled && (
                                <ProctoringIndicator
                                    status={proctoringStatus}
                                    strikes={proctoringStrikes}
                                    maxStrikes={3}
                                    capabilities={proctoringCapabilities}
                                />
                            )}
                            <div className="flex items-center gap-2 text-teal-400">
                                <Timer className="w-5 h-5" />
                                <span className="text-lg font-mono font-semibold">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-teal-400 font-semibold text-lg">
                                        Question {currentQuestionIndex + 1} of {questions.length}
                                    </span>
                                    {currentAnswer?.markedForReview && (
                                        <Flag className="w-5 h-5 text-purple-400 fill-purple-400" />
                                    )}
                                    <span className="ml-auto text-gray-500 text-sm">Marks: {currentQuestion?.marks || 1}</span>
                                </div>
                                <p className="text-xl leading-relaxed">{currentQuestion?.question_text}</p>
                            </div>

                            <div className="space-y-4">
                                {optionsList.map((optionText, idx) => {
                                    const isSelected = currentAnswer?.answer === optionText;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleOptionSelect(optionText)}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-teal-500 bg-teal-500/10'
                                                : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${isSelected ? 'bg-teal-500 text-black' : 'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <p className="text-lg pt-1">{optionText}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="bg-gray-900 p-4 border-t border-gray-800 flex justify-between items-center">
                        <button
                            onClick={handleClearResponse}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear Response
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={handleMarkForReview}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors ${currentAnswer?.markedForReview
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-gray-800 hover:bg-gray-700'
                                    }`}
                            >
                                <Flag className="w-4 h-4" />
                                {currentAnswer?.markedForReview ? 'Unmark Review' : 'Mark for Review'}
                            </button>

                            <button
                                onClick={handleSaveAndNext}
                                disabled={currentQuestionIndex === questions.length - 1}
                                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save & Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Question Palette (25%) */}
                <div className="w-1/4 bg-gray-950 flex flex-col border-l border-gray-800">
                    <div className="bg-gray-900 p-4 border-b border-gray-800">
                        <h3 className="text-lg font-semibold">Question Palette</h3>
                    </div>

                    <div className="p-4 border-b border-gray-800 space-y-2 text-sm grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                            <span>Not Visited</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            <span>Not Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <span>Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                            <span>Review</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-5 gap-3">
                            {questions.map((question, index) => {
                                const status = getQuestionStatus(question);
                                const isCurrent = index === currentQuestionIndex;

                                return (
                                    <button
                                        key={question.id}
                                        onClick={() => handleQuestionClick(index)}
                                        className={`
                                            w-10 h-10 rounded-full font-semibold transition-all text-sm
                                            ${getStatusColor(status)}
                                            ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-950 scale-110' : ''}
                                        `}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800">
                        <button
                            onClick={handleSectionSubmit}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <AlertCircle className="w-5 h-5" />
                            {isLastSection ? "Submit Test" : "Submit Section"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Final Confirmation Modal - Only for Last Section */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8">
                    <div className="bg-gray-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <AlertCircle className="w-12 h-12 text-yellow-500" />
                            <h2 className="text-2xl font-bold text-white">Confirm Final Submission</h2>
                        </div>
                        <p className="text-gray-300 text-lg mb-6">
                            Are you sure you want to submit your test?
                            <span className="block mt-2 text-yellow-400 font-semibold">
                                You cannot change your answers after submission!
                            </span>
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Modal - Tab Switch Violation */}
            {showWarningModal && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8">
                    <div className="bg-gray-900 border-2 border-red-500 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <XCircle className="w-12 h-12 text-red-500" />
                            <h2 className="text-2xl font-bold text-white">⚠️ Security Alert!</h2>
                        </div>
                        <p className="text-gray-300 text-lg mb-6">
                            You switched tabs or minimized the window. This action has been recorded.
                            <span className="block mt-2 text-red-400 font-semibold">
                                One more violation will automatically submit your test!
                            </span>
                        </p>
                        <button
                            onClick={() => setShowWarningModal(false)}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            {/* Transition Modal - Section Switch */}
            {showTransitionModal && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8">
                    <div className="bg-gray-900 border-2 border-teal-500 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center">
                        <div className="mb-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-teal-500/20 flex items-center justify-center">
                                <span className="text-5xl font-bold text-teal-400">{countdown}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">Section Transition</h2>
                            <p className="text-gray-300 text-lg">{transitionMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Proctoring - Camera Preview */}
            {proctoringEnabled && mediaStream && (
                <CameraPreview
                    stream={mediaStream}
                    videoRef={proctoringVideoRef}
                    isActive={proctoringEnabled}
                />
            )}

            {/* AI Proctoring - Violation Alert */}
            <ViolationAlert
                violation={currentViolation}
                result={currentViolationResult}
                isVisible={showViolationAlert}
                onDismiss={handleDismissViolation}
            />
        </>
    );
};

export default TestEngine;