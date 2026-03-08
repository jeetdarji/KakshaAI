import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trophy, Home, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ProctoringReport from '../components/proctoring/ProctoringReport';

const TestResult = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [submission, setSubmission] = useState(null);
    const [sections, setSections] = useState([]);
    const [questionsBySection, setQuestionsBySection] = useState({});
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [proctoringSession, setProctoringSession] = useState(null);

    useEffect(() => {
        const fetchResultData = async () => {
            try {
                // 1. Fetch the submission
                const { data: submissionData, error: submissionError } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('id', submissionId)
                    .single();

                if (submissionError) throw submissionError;
                setSubmission(submissionData);

                // 2. Fetch sections for this test
                const { data: sectionsData, error: sectionsError } = await supabase
                    .from('sections')
                    .select('*')
                    .eq('test_id', submissionData.test_id)
                    .order('order_index', { ascending: true });

                if (sectionsError) throw sectionsError;
                setSections(sectionsData);

                // 3. Fetch all questions grouped by section (in parallel)
                const questionsBySectionData = {};
                const questionPromises = sectionsData.map(async (section) => {
                    const { data: questionsData, error: questionsError } = await supabase
                        .from('questions')
                        .select('*')
                        .eq('section_id', section.id)
                        .order('id', { ascending: true });

                    if (questionsError) throw questionsError;
                    return { sectionId: section.id, questions: questionsData };
                });

                const results = await Promise.all(questionPromises);
                results.forEach(({ sectionId, questions }) => {
                    questionsBySectionData[sectionId] = questions;
                });

                setQuestionsBySection(questionsBySectionData);
                setLoading(false);

                // Fetch proctoring session for this test
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: procSession } = await supabase
                            .from('proctoring_sessions')
                            .select('*')
                            .eq('user_id', user.id)
                            .eq('test_id', submissionData.test_id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (procSession) {
                            setProctoringSession(procSession);
                        }
                    }
                } catch {
                    // Proctoring data optional — no error needed
                }
            } catch (error) {
                console.error('Error fetching result data:', error);
                navigate('/dashboard');
            }
        };

        fetchResultData();
    }, [submissionId, navigate]);

    const getQuestionStatus = (question) => {
        const userAnswer = submission?.answers?.[question.id]?.answer;
        const correctAnswer = question.correct_option;

        if (!userAnswer) return 'unattempted';
        if (userAnswer === correctAnswer) return 'correct';
        return 'wrong';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'correct': return 'bg-green-500 hover:bg-green-600 border-green-400';
            case 'wrong': return 'bg-red-500 hover:bg-red-600 border-red-400';
            case 'unattempted': return 'bg-gray-500 hover:bg-gray-600 border-gray-400';
            default: return 'bg-gray-500 hover:bg-gray-600 border-gray-400';
        }
    };

    const handleQuestionClick = (question) => {
        setSelectedQuestion(question);
        setShowReviewModal(true);
    };

    const getOptions = (q) => {
        if (!q?.options) return [];
        if (typeof q.options === 'string') {
            try { return JSON.parse(q.options); } catch (e) { return []; }
        }
        return q.options;
    };

    const calculateSectionStats = (sectionId) => {
        const questions = questionsBySection[sectionId] || [];
        let correct = 0;
        let wrong = 0;
        let unattempted = 0;

        questions.forEach(q => {
            const status = getQuestionStatus(q);
            if (status === 'correct') correct++;
            else if (status === 'wrong') wrong++;
            else unattempted++;
        });

        return { correct, wrong, unattempted, total: questions.length };
    };

    if (loading) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center`}>
                <div className={`${isDark ? 'text-white' : 'text-gray-900'} text-xl animate-pulse`}>Loading Results...</div>
            </div>
        );
    }

    const percentage = ((submission.score / submission.max_score) * 100).toFixed(1);
    const allQuestions = Object.values(questionsBySection).flat();
    const totalCorrect = allQuestions.filter(q => getQuestionStatus(q) === 'correct').length;
    const totalWrong = allQuestions.filter(q => getQuestionStatus(q) === 'wrong').length;
    const totalUnattempted = allQuestions.filter(q => getQuestionStatus(q) === 'unattempted').length;

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'} p-8 pt-24`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">Test Results</h1>
                    <button
                        onClick={() => navigate('/mock-tests')}
                        className={`flex items-center gap-2 px-6 py-3 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors`}
                    >
                        <Home className="w-5 h-5" />
                        Back to Tests
                    </button>
                </div>

                {/* Score Card */}
                <div className="bg-gradient-to-br from-teal-900/30 to-teal-800/20 border-2 border-teal-500 rounded-2xl p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10">
                        <Trophy className="w-64 h-64 text-teal-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-teal-400 mb-2">Your Score</h2>
                                <p className={`text-6xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {submission.score}
                                    <span className={`text-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/{submission.max_score}</span>
                                </p>
                                <p className="text-xl text-teal-300 mt-2">{percentage}% Accuracy</p>
                            </div>
                            <div className="text-right">
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-green-400">{totalCorrect}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">Correct</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-red-400">{totalWrong}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">Wrong</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-500/20 border-2 border-gray-500 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-gray-400">{totalUnattempted}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">Skipped</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Proctoring Report */}
                {proctoringSession && (
                    <div className="mb-6">
                        <ProctoringReport
                            sessionId={proctoringSession.id}
                            totalViolations={proctoringSession.total_violations || 0}
                            status={proctoringSession.proctoring_status}
                            isDark={isDark}
                        />
                    </div>
                )}

                {/* Legend */}
                <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-4 mb-6 flex items-center justify-center gap-8`}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green-500"></div>
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Correct Answer</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-red-500"></div>
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Wrong Answer</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gray-500"></div>
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Not Attempted</span>
                    </div>
                </div>

                {/* Questions Grid by Section */}
                {sections.map((section) => {
                    const questions = questionsBySection[section.id] || [];
                    const stats = calculateSectionStats(section.id);

                    return (
                        <div key={section.id} className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6 mb-6`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-2xl font-bold text-teal-400">{section.name}</h3>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-green-400">✓ {stats.correct}</span>
                                    <span className="text-red-400">✗ {stats.wrong}</span>
                                    <span className="text-gray-400">— {stats.unattempted}</span>
                                    <span className="text-gray-500">Total: {stats.total}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-10 gap-3">
                                {questions.map((question, index) => {
                                    const status = getQuestionStatus(question);
                                    return (
                                        <button
                                            key={question.id}
                                            onClick={() => handleQuestionClick(question)}
                                            className={`
                                                w-12 h-12 rounded-lg font-semibold transition-all text-sm border-2
                                                ${getStatusColor(status)}
                                            `}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Review Modal - FIXED WITH SCROLL */}
            {showReviewModal && selectedQuestion && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-8">
                    {/* Scrollable Container */}
                    <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
                        <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} border-2 rounded-2xl p-6 md:p-8`}>
                            {/* Modal Header - Sticky */}
                            <div className={`flex justify-between items-start mb-6 sticky top-0 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} pb-4 border-b z-10`}>
                                <div>
                                    <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Question Review</h3>
                                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Marks: {selectedQuestion.marks || 1}</p>
                                </div>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            {/* Question Text */}
                            <div className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-xl p-6 mb-6`}>
                                <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'} leading-relaxed`}>
                                    {selectedQuestion.question_text}
                                </p>
                            </div>

                            {/* Options */}
                            <div className="space-y-3 mb-6">
                                {getOptions(selectedQuestion).map((option, idx) => {
                                    const letterMap = ['A', 'B', 'C', 'D'];
                                    const optionLetter = letterMap[idx];
                                    const isCorrect = optionLetter === selectedQuestion.correct_option;
                                    const isUserAnswer = optionLetter === submission?.answers?.[selectedQuestion.id]?.answer;
                                    const isWrongUserAnswer = isUserAnswer && !isCorrect;

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-lg border-2 transition-all ${isCorrect
                                                ? 'border-green-500 bg-green-500/10'
                                                : isWrongUserAnswer
                                                    ? 'border-red-500 bg-red-500/10'
                                                    : isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${isCorrect
                                                    ? 'bg-green-500 text-black'
                                                    : isWrongUserAnswer
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-gray-700 text-gray-400'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{option}</p>
                                                    {isCorrect && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                                            <span className="text-sm text-green-400 font-semibold">Correct Answer</span>
                                                        </div>
                                                    )}
                                                    {isWrongUserAnswer && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <XCircle className="w-4 h-4 text-red-400" />
                                                            <span className="text-sm text-red-400 font-semibold">Your Answer</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Summary */}
                            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 mb-6`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Your Answer</p>
                                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {submission?.answers?.[selectedQuestion.id]?.answer
                                                ? `${submission.answers[selectedQuestion.id].answer} — ${getOptions(selectedQuestion)[['A', 'B', 'C', 'D'].indexOf(submission.answers[selectedQuestion.id].answer)] || ''}`
                                                : 'Not Attempted'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400 mb-1">Correct Answer</p>
                                        <p className="text-lg font-semibold text-green-400">
                                            {selectedQuestion.correct_option} — {getOptions(selectedQuestion)[['A', 'B', 'C', 'D'].indexOf(selectedQuestion.correct_option)] || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="text-center">
                                {getQuestionStatus(selectedQuestion) === 'correct' && (
                                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 border-2 border-green-500 rounded-full">
                                        <CheckCircle className="w-6 h-6 text-green-400" />
                                        <span className="text-green-400 font-bold text-lg">Correct Answer!</span>
                                    </div>
                                )}
                                {getQuestionStatus(selectedQuestion) === 'wrong' && (
                                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 border-2 border-red-500 rounded-full">
                                        <XCircle className="w-6 h-6 text-red-400" />
                                        <span className="text-red-400 font-bold text-lg">Incorrect Answer</span>
                                    </div>
                                )}
                                {getQuestionStatus(selectedQuestion) === 'unattempted' && (
                                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-500/20 border-2 border-gray-500 rounded-full">
                                        <AlertCircle className="w-6 h-6 text-gray-400" />
                                        <span className="text-gray-400 font-bold text-lg">Not Attempted</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestResult;