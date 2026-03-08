import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Trash2, File, FileType } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';

const UserNoteItem = ({
    note,
    onPreview,
    onDownload,
    onDelete,
    index = 0,
    className
}) => {
    const {
        id,
        file_name,
        file_size,
        file_type,
        created_at
    } = note;

    const { isDark } = useTheme();

    // Format relative time
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
    };

    // Get icon based on file type
    const getFileIcon = () => {
        switch (file_type?.toLowerCase()) {
            case 'pdf':
                return <FileText className="text-red-400" size={20} />;
            case 'doc':
            case 'docx':
                return <FileType className="text-blue-400" size={20} />;
            case 'txt':
                return <File className="text-gray-400" size={20} />;
            default:
                return <FileText className="text-white/50" size={20} />;
        }
    };

    // Truncate filename if too long
    const truncateFilename = (name, maxLength = 35) => {
        if (!name || name.length <= maxLength) return name;
        const extension = name.split('.').pop();
        const baseName = name.slice(0, -(extension.length + 1));
        const truncatedBase = baseName.slice(0, maxLength - extension.length - 4) + '...';
        return `${truncatedBase}.${extension}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className={cn(
                'flex items-center gap-4 p-4 rounded-xl',
                isDark ? 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10' : 'bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100',
                'transition-all duration-200 group',
                className
            )}
        >
            {/* File Icon */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'} flex-shrink-0`}>
                {getFileIcon()}
            </div>

            {/* File Info */}
            <div className="flex-grow min-w-0">
                <h4 className={`font-general font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`} title={file_name}>
                    {truncateFilename(file_name)}
                </h4>
                <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-white/40' : 'text-gray-400'} font-general mt-1`}>
                    <span>{file_size}</span>
                    <span>•</span>
                    <span>Uploaded {getRelativeTime(created_at)}</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview?.(note)}
                    className={`${isDark ? 'text-white/60' : 'text-gray-500'} hover:text-brand hover:bg-brand/10 p-2`}
                    title="Preview"
                >
                    <Eye size={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload?.(note)}
                    className={`${isDark ? 'text-white/60' : 'text-gray-500'} hover:text-brand hover:bg-brand/10 p-2`}
                    title="Download"
                >
                    <Download size={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete?.(note)}
                    className={`${isDark ? 'text-white/60' : 'text-gray-500'} hover:text-red-400 hover:bg-red-500/10 p-2`}
                    title="Delete"
                >
                    <Trash2 size={16} />
                </Button>
            </div>
        </motion.div>
    );
};

export default UserNoteItem;
