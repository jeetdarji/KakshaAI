import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const FileUploadZone = ({
    onFileSelect,
    isUploading = false,
    uploadProgress = 0,
    acceptedTypes = ['.pdf', '.doc', '.docx', '.txt'],
    maxSizeMB = 10,
    className
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState(null);
    const { isDark } = useTheme();

    const acceptedExtensions = acceptedTypes.map(t => t.replace('.', '').toUpperCase()).join(', ');

    const validateFile = (file) => {
        // Check file type
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!acceptedTypes.includes(extension)) {
            return `Unsupported file type. Accepted: ${acceptedExtensions}`;
        }

        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return `File too large. Maximum size: ${maxSizeMB}MB`;
        }

        return null;
    };

    const handleFiles = useCallback((files) => {
        if (files.length === 0) return;

        const file = files[0];
        const validationError = validateFile(file);

        if (validationError) {
            setError(validationError);
            setTimeout(() => setError(null), 3000);
            return;
        }

        setError(null);
        onFileSelect?.(file);
    }, [onFileSelect, acceptedTypes, maxSizeMB]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleInputChange = (e) => {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset input
    };

    return (
        <div className={cn('relative', className)}>
            <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200',
                    isDragOver
                        ? 'border-brand bg-brand/10'
                        : isDark ? 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
                    isUploading && 'pointer-events-none opacity-70'
                )}
            >
                <input
                    type="file"
                    accept={acceptedTypes.join(',')}
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={isUploading}
                />

                {isUploading ? (
                    <>
                        <Loader2 className="w-12 h-12 text-brand animate-spin" />
                        <div className="text-center">
                            <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-general font-medium`}>Uploading...</p>
                            <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} text-sm font-general`}>{uploadProgress}%</p>
                        </div>
                        {/* Progress bar */}
                        <div className={`w-full max-w-xs h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                            <motion.div
                                className="h-full bg-brand rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={cn(
                            'p-4 rounded-xl transition-colors',
                            isDragOver ? 'bg-brand/20' : isDark ? 'bg-white/10' : 'bg-gray-200'
                        )}>
                            <Upload className={cn(
                                'w-8 h-8 transition-colors',
                                isDragOver ? 'text-brand' : isDark ? 'text-white/50' : 'text-gray-400'
                            )} />
                        </div>
                        <div className="text-center">
                            <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-general font-medium`}>
                                {isDragOver ? 'Drop your file here' : 'Click to upload or drag & drop'}
                            </p>
                            <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm font-general mt-1`}>
                                Supported: {acceptedExtensions}
                            </p>
                            <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm font-general`}>
                                Max size: {maxSizeMB}MB
                            </p>
                        </div>
                    </>
                )}
            </label>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-red-400 text-sm font-general"
                >
                    <X size={14} />
                    {error}
                </motion.div>
            )}
        </div>
    );
};

export default FileUploadZone;
