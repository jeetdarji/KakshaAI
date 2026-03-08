import React from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const VideoListItem = ({
    video,
    onPlay,
    isActive = false,
    index = 0,
    className
}) => {
    const {
        id,
        title,
        duration,
        duration_seconds,
        status = 'not-started', // 'watched', 'in-progress', 'not-started'
        watchedPercent = 0,
        thumbnailUrl
    } = video;

    const { isDark } = useTheme();

    // Format duration properly
    const formatDuration = () => {
        if (duration_seconds) {
            const hours = Math.floor(duration_seconds / 3600);
            const minutes = Math.floor((duration_seconds % 3600) / 60);
            const seconds = duration_seconds % 60;
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return duration || 'N/A';
    };

    const getStatusIndicator = () => {
        switch (status) {
            case 'watched':
                return (
                    <div className="flex items-center gap-1.5 text-brand">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-general">Watched</span>
                    </div>
                );
            case 'in-progress':
                return (
                    <div className="flex items-center gap-1.5 text-orange-400">
                        <div className="relative w-4 h-4">
                            <svg className="w-4 h-4 -rotate-90">
                                <circle
                                    cx="8"
                                    cy="8"
                                    r="6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    opacity="0.2"
                                />
                                <circle
                                    cx="8"
                                    cy="8"
                                    r="6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeDasharray={`${watchedPercent * 0.377} 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        <span className="text-xs font-general">{watchedPercent}%</span>
                    </div>
                );
            default:
                return (
                    <div className={`flex items-center gap-1.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <Clock size={14} />
                        <span className="text-xs font-general">Not Started</span>
                    </div>
                );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => onPlay?.(video)}
            className={cn(
                'flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200',
                'border border-transparent',
                isActive
                    ? 'bg-brand/10 border-brand/30'
                    : isDark ? 'bg-white/5 hover:bg-white/10 hover:border-white/10' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-200',
                className
            )}
        >
            {/* Index or Play Icon */}
            <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                isActive ? 'bg-brand text-white' : isDark ? 'bg-white/10 text-white/50' : 'bg-gray-200 text-gray-500'
            )}>
                {isActive ? (
                    <Play size={18} fill="currentColor" />
                ) : (
                    <span className="text-sm font-mono font-bold">{index + 1}</span>
                )}
            </div>

            {/* Content */}
            <div className="flex-grow min-w-0">
                <h4 className={cn(
                    'font-general font-medium truncate transition-colors',
                    isActive ? 'text-brand' : isDark ? 'text-white' : 'text-gray-900'
                )}>
                    {title}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'} font-mono`}>{formatDuration()}</span>
                    {getStatusIndicator()}
                </div>
            </div>

            {/* Play Button on Hover */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                    isActive
                        ? 'bg-brand text-white'
                        : isDark ? 'bg-white/10 text-white/50 hover:bg-brand hover:text-white' : 'bg-gray-200 text-gray-500 hover:bg-brand hover:text-white'
                )}
            >
                <Play size={16} fill="currentColor" />
            </motion.button>
        </motion.div>
    );
};

export default VideoListItem;
