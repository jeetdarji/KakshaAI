import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const VideoPlayer = ({
    videoUrl,
    videoId,
    title = 'Video',
    onProgress,
    className
}) => {
    const playerRef = useRef(null);
    const intervalRef = useRef(null);
    const containerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const lastProgressRef = useRef(0);
    const { isDark } = useTheme();

    // Extract YouTube video ID from various URL formats
    const getYouTubeId = (url) => {
        if (!url) return videoId;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : videoId;
    };

    const ytId = getYouTubeId(videoUrl);

    const stopProgressTracking = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const startProgressTracking = useCallback(() => {
        if (!onProgress || intervalRef.current) return;

        intervalRef.current = setInterval(() => {
            try {
                if (playerRef.current && 
                    typeof playerRef.current.getCurrentTime === 'function' && 
                    typeof playerRef.current.getDuration === 'function') {
                    
                    const currentTime = playerRef.current.getCurrentTime();
                    const duration = playerRef.current.getDuration();
                    
                    if (duration > 0 && currentTime > 0) {
                        const percentage = Math.min(100, Math.round((currentTime / duration) * 100));
                        
                        // Only call onProgress if percentage changed significantly (at least 1%)
                        if (Math.abs(percentage - lastProgressRef.current) >= 1) {
                            lastProgressRef.current = percentage;
                            onProgress(percentage);
                        }
                    }
                }
            } catch (err) {
                console.error('Error tracking video progress:', err);
            }
        }, 5000); // Update every 5 seconds
    }, [onProgress]);

    useEffect(() => {
        if (!ytId) {
            setError('Invalid video ID');
            return;
        }

        let mounted = true;

        // Load YouTube IFrame API if not already loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.async = true;
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        // Initialize player when API is ready
        const initPlayer = () => {
            if (!mounted || !ytId) return;

            try {
                // Destroy existing player if any
                if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                    playerRef.current.destroy();
                    playerRef.current = null;
                }

                // Create container element if it doesn't exist
                const containerId = `youtube-player-${ytId}`;
                let container = document.getElementById(containerId);
                
                if (!container && containerRef.current) {
                    container = document.createElement('div');
                    container.id = containerId;
                    containerRef.current.appendChild(container);
                }

                if (window.YT && window.YT.Player && container) {
                    playerRef.current = new window.YT.Player(containerId, {
                        videoId: ytId,
                        width: '100%',
                        height: '100%',
                        playerVars: {
                            rel: 0,
                            modestbranding: 1,
                            playsinline: 1,
                            enablejsapi: 1,
                        },
                        events: {
                            onReady: (event) => {
                                if (mounted) {
                                    setIsReady(true);
                                    setError(null);
                                }
                            },
                            onStateChange: (event) => {
                                if (!mounted) return;

                                // Start tracking when video is playing
                                if (event.data === window.YT.PlayerState.PLAYING) {
                                    startProgressTracking();
                                } else if (event.data === window.YT.PlayerState.PAUSED) {
                                    stopProgressTracking();
                                } else if (event.data === window.YT.PlayerState.ENDED) {
                                    stopProgressTracking();
                                    // Mark as 100% complete when video ends
                                    if (onProgress) {
                                        onProgress(100);
                                    }
                                }
                            },
                            onError: (event) => {
                                console.error('YouTube player error:', event.data);
                                setError('Failed to load video');
                                stopProgressTracking();
                            }
                        },
                    });
                }
            } catch (err) {
                console.error('Error initializing YouTube player:', err);
                setError('Failed to initialize player');
            }
        };

        // Wait for API to be ready
        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            mounted = false;
            stopProgressTracking();
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch (err) {
                    console.error('Error destroying player:', err);
                }
                playerRef.current = null;
            }
        };
    }, [ytId, onProgress, startProgressTracking, stopProgressTracking]);

    if (!ytId) {
        return (
            <div className={cn(
                `aspect-video ${isDark ? 'bg-dark-card border-white/10' : 'bg-gray-100 border-gray-200'} rounded-2xl flex items-center justify-center border`,
                className
            )}>
                <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} font-general`}>Video not available</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn(
                `aspect-video ${isDark ? 'bg-dark-card border-white/10' : 'bg-gray-100 border-gray-200'} rounded-2xl flex items-center justify-center border`,
                className
            )}>
                <div className="text-center">
                    <p className="text-red-400 font-general mb-2">{error}</p>
                    <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm font-general`}>Video ID: {ytId}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(`relative rounded-2xl overflow-hidden ${isDark ? 'bg-dark-card' : 'bg-gray-100'}`, className)}>
            <div className="aspect-video" ref={containerRef}>
                {/* YouTube player will be injected here */}
            </div>
            {!isReady && (
                <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-dark-card' : 'bg-gray-100'}`}>
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className={`${isDark ? 'text-white/60' : 'text-gray-500'} font-general text-sm`}>Loading video...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
