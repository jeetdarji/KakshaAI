import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';

const FormulaBookCard = ({
    book,
    onDownload,
    variant = 'default', // 'default', 'compact'
    index = 0,
    className
}) => {
    const {
        id,
        title,
        subject,
        pageCount,
        description,
        fileUrl,
        coverImage
    } = book;

    const subjectColors = {
        Physics: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-400',
            border: 'border-blue-500/20',
        },
        Chemistry: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            border: 'border-emerald-500/20',
        },
        Maths: {
            bg: 'bg-orange-500/10',
            text: 'text-orange-400',
            border: 'border-orange-500/20',
        },
    };

    const colors = subjectColors[subject] || subjectColors.Physics;
    const { isDark } = useTheme();

    if (variant === 'compact') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                    'flex items-center gap-4 p-4 rounded-xl',
                    isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100',
                    'hover:border-brand/30 transition-all duration-200',
                    className
                )}
            >
                <div className={cn('p-3 rounded-lg', colors.bg)}>
                    <BookOpen size={20} className={colors.text} />
                </div>
                <div className="flex-grow min-w-0">
                    <h4 className="font-general font-medium truncate">{title}</h4>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'} font-general`}>{pageCount} pages</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload?.(book)}
                    className="text-brand hover:bg-brand/10"
                >
                    <Download size={16} />
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.25, 0.1, 0.25, 1]
            }}
            whileHover={{ y: -3 }}
            className={cn(
                isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white border border-gray-200 shadow-sm',
                'p-6 rounded-2xl relative overflow-hidden group',
                'hover:border-brand/50 hover:shadow-[0_0_25px_-10px_rgba(20,184,166,0.3)] transition-all duration-300',
                className
            )}
        >
            {/* Decorative gradient */}
            <div className={cn(
                'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2',
                colors.bg
            )} />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className={cn(
                        'p-4 rounded-xl border',
                        colors.bg,
                        colors.border
                    )}>
                        <BookOpen size={28} className={colors.text} />
                    </div>
                    <div className="flex-grow">
                        <span className={cn(
                            'text-xs font-semibold font-general uppercase',
                            colors.text
                        )}>
                            {subject}
                        </span>
                        <h3 className="font-heading font-bold text-lg mt-1 group-hover:text-brand transition-colors">
                            {title}
                        </h3>
                    </div>
                </div>

                {/* Description */}
                {description && (
                    <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} text-sm font-general mb-4 line-clamp-2`}>
                        {description}
                    </p>
                )}

                {/* Meta */}
                <div className={`flex items-center gap-4 text-sm ${isDark ? 'text-white/40' : 'text-gray-400'} font-general mb-4`}>
                    <span className="flex items-center gap-1.5">
                        <FileText size={14} />
                        {pageCount} pages
                    </span>
                    <span>Complete 11th + 12th</span>
                </div>

                {/* Download Button */}
                <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => onDownload?.(book)}
                >
                    <Download size={18} className="mr-2" />
                    Download PDF
                </Button>
            </div>
        </motion.div>
    );
};

export default FormulaBookCard;
