import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FileUploadZone from './FileUploadZone';
import UserNoteItem from './UserNoteItem';
import Card from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

const UserNotesList = ({
    subject,
    userId,
    className
}) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { isDark } = useTheme();

    // Fetch user notes
    const fetchNotes = useCallback(async () => {
        if (!userId || !subject) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_notes')
                .select('*')
                .eq('user_id', userId)
                .eq('subject', subject)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (err) {
            console.error('Error fetching notes:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, subject]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // Handle file upload
    const handleFileSelect = async (file) => {
        if (!userId || !subject) {
            alert('Please log in to upload notes');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(10);

            // Generate unique file path
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const timestamp = Date.now();
            const fileName = `${userId}/${subject}/${timestamp}_${file.name}`;

            setUploadProgress(30);

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('user-notes')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            setUploadProgress(60);

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('user-notes')
                .getPublicUrl(fileName);

            setUploadProgress(80);

            // Save metadata to database
            const { data: noteData, error: noteError } = await supabase
                .from('user_notes')
                .insert({
                    user_id: userId,
                    subject: subject,
                    file_name: file.name,
                    file_path: fileName,
                    file_url: urlData.publicUrl,
                    file_size: formatFileSize(file.size),
                    file_type: fileExtension,
                })
                .select()
                .single();

            if (noteError) throw noteError;

            setUploadProgress(100);

            // Add to local state
            setNotes(prev => [noteData, ...prev]);

            // Reset after delay
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload note. Please try again.');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Handle preview
    const handlePreview = (note) => {
        if (note.file_type === 'pdf') {
            // Open PDF in new tab
            window.open(note.file_url, '_blank');
        } else if (['doc', 'docx'].includes(note.file_type)) {
            // Use Google Docs Viewer
            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(note.file_url)}&embedded=true`;
            window.open(viewerUrl, '_blank');
        } else {
            // Open directly for text files
            window.open(note.file_url, '_blank');
        }
    };

    // Handle download
    const handleDownload = (note) => {
        window.open(note.file_url, '_blank');
    };

    // Handle delete
    const handleDelete = async (note) => {
        const confirmed = window.confirm(`Delete "${note.file_name}"?`);
        if (!confirmed) return;

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('user-notes')
                .remove([note.file_path]);

            if (storageError) {
                console.warn('Storage deletion warning:', storageError);
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('user_notes')
                .delete()
                .eq('id', note.id);

            if (dbError) throw dbError;

            // Remove from local state
            setNotes(prev => prev.filter(n => n.id !== note.id));

        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete note. Please try again.');
        }
    };

    return (
        <div className={className}>
            {/* Upload Zone */}
            <div className="mb-8">
                <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-brand" />
                    Upload Your Notes
                </h3>
                <FileUploadZone
                    onFileSelect={handleFileSelect}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                />
            </div>

            {/* Notes List */}
            <div>
                <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-brand" />
                    Uploaded Notes {notes.length > 0 && `(${notes.length})`}
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand animate-spin" />
                    </div>
                ) : notes.length === 0 ? (
                    <Card className="p-10 text-center">
                        <FileText className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={48} />
                        <h4 className="text-lg font-heading font-bold mb-2">No notes uploaded yet</h4>
                        <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} font-general text-sm`}>
                            Upload your first note using the button above!
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {notes.map((note, i) => (
                                <UserNoteItem
                                    key={note.id}
                                    note={note}
                                    index={i}
                                    onPreview={handlePreview}
                                    onDownload={handleDownload}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Helper Text */}
            <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
                <Lightbulb className="text-brand flex-shrink-0 mt-0.5" size={18} />
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'} font-general`}>
                    Your notes are private and only visible to you. Upload any study material
                    including handwritten notes, typed summaries, or practice sheets!
                </p>
            </div>
        </div>
    );
};

export default UserNotesList;
