import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';

const NoteCard = ({
    note,
    onPreview,
    onDownload,
    index = 0,
    className
}) => {
    const {
        id,
        title,
        pageCount,
        type = 'handwritten', // 'handwritten', 'typed', 'pdf'
        uploadDate,
        subject,
        fileUrl
    } = note;

    const subjectColors = {
        Physics: 'text-blue-400',
        Chemistry: 'text-emerald-400',
        Maths: 'text-orange-400',
    };

    const typeLabels = {
        handwritten: 'Handwritten',
        typed: 'Typed Notes',
        pdf: 'PDF',
    };

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
            whileHover={{ y: -3 }}
            className={cn(
                isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white border border-gray-200 shadow-sm',
                'p-5 rounded-2xl relative overflow-hidden group',
                'hover:border-brand/50 hover:shadow-[0_0_25px_-10px_rgba(20,184,166,0.3)] transition-all duration-300',
                className
            )}
        >
            {/* Internal highlight */}
            <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10">
                {/* Icon and Type */}
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-brand/10 text-brand">
                        <FileText size={24} />
                    </div>
                    <span className={`text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-400'} px-2 py-1 rounded ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                        {typeLabels[type]}
                    </span>
                </div>

                {/* Title */}
                <h4 className="font-heading font-bold text-lg mb-2 group-hover:text-brand transition-colors line-clamp-2">
                    {title}
                </h4>

                {/* Meta Info */}
                <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-white/40' : 'text-gray-400'} font-general mb-4`}>
                    {pageCount && (
                        <span>{pageCount} pages</span>
                    )}
                    {subject && (
                        <span className={subjectColors[subject]}>{subject}</span>
                    )}
                    {uploadDate && (
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {uploadDate}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className={`flex gap-2 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => onPreview?.(note)}
                    >
                        <Eye size={14} className="mr-1.5" />
                        Preview
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => onDownload?.(note)}
                    >
                        <Download size={14} className="mr-1.5" />
                        Download
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default NoteCard;
