import { motion } from 'framer-motion';
import { Video, FileText, ClipboardList, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import ProgressBar from './ProgressBar';
import Button from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';

const ChapterCard = ({
    chapter,
    onClick,
    index = 0,
    className
}) => {
    const {
        title,
        subject,
        classYear,
        progress = 0,
        totalTopics = 0,
        completedTopics = 0,
        hasVideos = false,
        hasNotes = false,
        hasPractice = false
    } = chapter;

    const subjectColors = {
        Physics: {
            badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            glow: 'group-hover:shadow-blue-500/20',
        },
        Chemistry: {
            badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            glow: 'group-hover:shadow-emerald-500/20',
        },
        Maths: {
            badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            glow: 'group-hover:shadow-orange-500/20',
        },
    };

    const colors = subjectColors[subject] || subjectColors.Physics;
    const isCompleted = progress === 100;
    const { isDark } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.25, 0.1, 0.25, 1]
            }}
            whileHover={{ y: -5 }}
            onClick={onClick}
            className={cn(
                isDark 
                    ? 'bg-white/5 backdrop-blur-md border border-white/10' 
                    : 'bg-white border border-gray-200 shadow-sm',
                'p-6 rounded-2xl relative overflow-hidden cursor-pointer group',
                'hover:border-brand/50 hover:shadow-[0_0_30px_-10px_rgba(20,184,166,0.3)] transition-all duration-300 ease-out',
                colors.glow,
                className
            )}
        >
            {/* Internal highlight layer */}
            <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Completion Badge */}
            {isCompleted && (
                <div className="absolute top-4 right-4">
                    <CheckCircle2 className="text-brand" size={24} />
                </div>
            )}

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-semibold font-general border',
                        colors.badge
                    )}>
                        {subject}
                    </span>
                    <span className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-xs font-mono`}>
                        {completedTopics}/{totalTopics} Topics
                    </span>
                </div>

                {/* Title */}
                <h3 className={`text-xl font-heading font-bold mb-1 group-hover:text-brand transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {title}
                </h3>

                {/* Class indicator */}
                {classYear && (
                    <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm font-general mb-4`}>
                        Class {classYear}
                    </p>
                )}

                {/* Progress */}
                <div className="mt-4">
                    <ProgressBar
                        percentage={progress}
                        animated={true}
                        size="md"
                    />
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between">
                    {/* Resource Icons */}
                    <div className="flex gap-2">
                        {hasVideos && (
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:text-brand hover:border-brand/30 transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <Video size={14} />
                            </div>
                        )}
                        {hasNotes && (
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:text-brand hover:border-brand/30 transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <FileText size={14} />
                            </div>
                        )}
                        {hasPractice && (
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:text-brand hover:border-brand/30 transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <ClipboardList size={14} />
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-brand hover:bg-brand/10 -mr-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick?.();
                        }}
                    >
                        {isCompleted ? 'Review' : 'Continue'} <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default ChapterCard;
