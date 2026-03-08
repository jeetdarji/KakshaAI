import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
    ArrowLeft,
    Download,
    Maximize,
    Minimize,
    Loader2,
    FileText,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
// Google Drive preview is used instead of react-pdf for CORS compatibility

const PaperViewer = () => {
    const { paperId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // Paper data
    const [paper, setPaper] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // PDF viewer states
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Solve mode states
    const [solveMode, setSolveMode] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerIntervalRef = useRef(null);

    // Fetch paper details
    useEffect(() => {
        fetchPaper();
    }, [paperId]);

    // Timer effect
    useEffect(() => {
        if (startTime && solveMode) {
            timerIntervalRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(timerIntervalRef.current);
        } else if (!solveMode && timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, [startTime, solveMode]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, []);

    const fetchPaper = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('papers')
                .select('*')
                .eq('id', paperId)
                .single();

            if (fetchError) throw fetchError;
            if (!data) throw new Error('Paper not found');

            setPaper(data);
        } catch (err) {
            console.error('Error fetching paper:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getGoogleDrivePreviewUrl = (url) => {
        if (!url) return url;
        const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
        const match2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match2) return `https://drive.google.com/file/d/${match2[1]}/preview`;
        return url;
    };

    const handleFullScreen = () => {
        const viewer = document.getElementById('pdf-viewer-container');
        if (!isFullScreen) {
            (viewer || document.documentElement).requestFullscreen();
        } else {
            document.exitFullscreen();
        }
        setIsFullScreen(!isFullScreen);
    };

    const handleDownload = () => {
        if (paper.file_url) {
            const a = document.createElement('a');
            a.href = paper.file_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.click();
        }
    };

    const startSolveMode = () => {
        setSolveMode(true);
        setStartTime(Date.now());
        setCurrentPage(1);
    };

    const endSolveMode = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to end the test? Your progress will be saved.'
        );

        if (confirmed) {
            // Here you can save the progress to database
            // For now, we'll just stop the timer
            setSolveMode(false);
            setStartTime(null);

            // Optional: Save to database
            // await saveProgress();

            alert(`Test completed!\nTime taken: ${formatTime(elapsedTime)}`);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="container mx-auto px-6 py-8 pt-32 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto mb-4 text-brand" size={48} />
                    <p className={`${isDark ? 'text-white/70' : 'text-gray-500'} font-general`}>Loading paper...</p>
                </div>
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="container mx-auto px-6 py-8 pt-32">
                <Card className="p-12 text-center">
                    <FileText className="mx-auto mb-4 text-red-400" size={64} />
                    <h3 className="text-xl font-heading font-bold mb-2">Paper Not Found</h3>
                    <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general mb-6`}>{error || 'The requested paper could not be found.'}</p>
                    <Button onClick={() => navigate('/papers')} variant="secondary">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Papers
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-dark' : 'bg-gray-50'}`}>
            {/* Header */}
            <div className={`${isDark ? 'bg-dark-card border-white/10' : 'bg-white border-gray-200'} border-b sticky top-0 z-50`}>
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left: Back button and title */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/papers')}
                                className="flex-shrink-0"
                            >
                                <ArrowLeft size={18} />
                            </Button>
                            <div className="min-w-0">
                                <h1 className="font-heading font-bold text-lg truncate">
                                    {paper.title}
                                </h1>
                                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'} font-general`}>
                                    {paper.subject} • {paper.year}
                                </p>
                            </div>
                        </div>

                        {/* Center: Timer (when in solve mode) */}
                        {solveMode && (
                            <div className="hidden md:flex items-center gap-2 bg-brand/10 px-4 py-2 rounded-lg">
                                <Clock size={18} className="text-brand" />
                                <span className="font-mono text-brand font-bold">
                                    {formatTime(elapsedTime)}
                                </span>
                            </div>
                        )}

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {!solveMode ? (
                                <>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={startSolveMode}
                                        className="hidden sm:flex"
                                    >
                                        <CheckCircle2 size={16} className="mr-2" />
                                        Start Solving
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownload}
                                    >
                                        <Download size={16} className="mr-2 hidden sm:inline" />
                                        Download
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={endSolveMode}
                                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                >
                                    End Test
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF Viewer Controls */}
            <div className={`${isDark ? 'bg-dark-card/50 border-white/10' : 'bg-white/50 border-gray-200'} border-b sticky top-[73px] z-40`}>
                <div className="container mx-auto px-6 py-3">
                    <div className="flex items-center justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleFullScreen}
                        >
                            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                            <span className="ml-2 text-sm hidden sm:inline">
                                {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            </span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* PDF Viewer - Google Drive Embed */}
            <div id="pdf-viewer-container" className="container mx-auto px-6 py-8">
                <div className="flex justify-center">
                    <Card className="w-full max-w-5xl overflow-hidden">
                        <iframe
                            src={getGoogleDrivePreviewUrl(paper.file_url)}
                            className="w-full border-0"
                            style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
                            allow="autoplay"
                            title={paper.title || 'Paper Preview'}
                        />
                    </Card>
                </div>

                {/* Mobile Timer (when in solve mode) */}
                {solveMode && (
                    <div className="md:hidden fixed bottom-6 right-6 bg-brand text-white px-4 py-2 rounded-lg shadow-lg">
                        <div className="flex items-center gap-2">
                            <Clock size={18} />
                            <span className="font-mono font-bold">
                                {formatTime(elapsedTime)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Mobile Solve Button */}
                {!solveMode && (
                    <div className="sm:hidden fixed bottom-6 right-6">
                        <Button
                            variant="primary"
                            onClick={startSolveMode}
                            className="shadow-lg"
                        >
                            <CheckCircle2 size={18} className="mr-2" />
                            Start Solving
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaperViewer;