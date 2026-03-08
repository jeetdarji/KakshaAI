import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase } from './lib/supabase';
import SplashLoader from './components/SplashLoader';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import StudyHub from './pages/StudyHub';
import ChapterDetail from './pages/ChapterDetail';
import PastPapers from './pages/PastPapers';
import Cutoffs from './pages/Cutoffs';
import MockTests from './pages/MockTests';
import AIAssistant from './pages/AIAssistant';
import SignIn from './pages/SignIn';
import TestEngine from './pages/TestEngine';
import TestResult from './pages/TestResult';
import PaperViewer from './pages/PaperViewer';
import AboutUs from './pages/AboutUs';
import Blog from './pages/Blog';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';

// Inner component that has access to Router context
function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();

    // Show splash only on root "/" and only once per session
    const isRootPath = location.pathname === '/';
    const alreadySeen = sessionStorage.getItem('kaksha_splash_seen') === '1';
    const [showSplash, setShowSplash] = useState(isRootPath && !alreadySeen);
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    // Check auth state while splash animates
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
            setAuthReady(true);
        });
    }, []);

    const handleSplashComplete = useCallback(() => {
        sessionStorage.setItem('kaksha_splash_seen', '1');
        setShowSplash(false);

        // After splash, redirect logged-in users to dashboard
        if (authReady && user && location.pathname === '/') {
            navigate('/dashboard', { replace: true });
        }
    }, [authReady, user, navigate, location.pathname]);

    return (
        <>
            {/* Splash overlay – renders above everything */}
            <AnimatePresence mode="wait">
                {showSplash && <SplashLoader onComplete={handleSplashComplete} />}
            </AnimatePresence>

            {/* Main app – hidden behind splash until it exits */}
            <div
                className="min-h-screen text-gray-900 dark:text-white"
                style={showSplash ? { opacity: 0, pointerEvents: 'none' } : undefined}
            >
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route path="login" element={<SignIn />} />
                        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                        <Route path="study-hub" element={<ProtectedRoute><StudyHub /></ProtectedRoute>} />
                        <Route path="study-hub/chapter/:chapterId" element={<ProtectedRoute><ChapterDetail /></ProtectedRoute>} />
                        <Route path="papers" element={<ProtectedRoute><PastPapers /></ProtectedRoute>} />
                        <Route path="cutoffs" element={<ProtectedRoute><Cutoffs /></ProtectedRoute>} />
                        <Route path="mock-tests" element={<ProtectedRoute><MockTests /></ProtectedRoute>} />
                        <Route path="ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
                        <Route path="/attempt/:testId" element={<ProtectedRoute><TestEngine /></ProtectedRoute>} />
                        <Route path="/result/:submissionId" element={<ProtectedRoute><TestResult /></ProtectedRoute>} />
                        <Route path="/study-hub/past-papers/:paperId" element={<ProtectedRoute><PaperViewer /></ProtectedRoute>} />
                        <Route path="about" element={<AboutUs />} />
                        <Route path="blog" element={<Blog />} />
                        <Route path="privacy" element={<PrivacyPolicy />} />
                        <Route path="terms" element={<TermsOfService />} />
                        <Route path="cookies" element={<CookiePolicy />} />
                    </Route>
                </Routes>
            </div>
        </>
    );
}

function App() {
    return (
        <ThemeProvider>
            <Router>
                <AppContent />
            </Router>
        </ThemeProvider>
    )
}

export default App
