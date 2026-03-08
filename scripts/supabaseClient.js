/**
 * Supabase Client Configuration
 * 
 * This file sets up the Supabase client for interacting with your database and storage.
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!');
    console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: {
            'x-application-name': 'study-hub',
        },
    },
});

// Helper functions for common operations

/**
 * Fetch all papers with optional filters
 */
export const fetchPapers = async (filters = {}) => {
    let query = supabase
        .from('papers')
        .select('*')
        .order('year', { ascending: false });

    if (filters.year) {
        query = query.eq('year', filters.year);
    }
    if (filters.subject) {
        query = query.eq('subject', filters.subject);
    }
    if (filters.exam_type) {
        query = query.eq('exam_type', filters.exam_type);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching papers:', error);
        throw error;
    }

    return data;
};

/**
 * Fetch a single paper by ID
 */
export const fetchPaperById = async (paperId) => {
    const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

    if (error) {
        console.error('Error fetching paper:', error);
        throw error;
    }

    return data;
};

/**
 * Get public URL for a file in storage
 */
export const getFileUrl = (filePath) => {
    const { data } = supabase.storage
        .from('papers')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

/**
 * Download a file from storage
 */
export const downloadFile = async (filePath) => {
    const { data, error } = await supabase.storage
        .from('papers')
        .download(filePath);

    if (error) {
        console.error('Error downloading file:', error);
        throw error;
    }

    return data;
};

/**
 * Save user progress for a paper
 */
export const saveProgress = async (userId, paperId, progressData) => {
    const { data, error } = await supabase
        .from('user_paper_progress')
        .upsert({
            user_id: userId,
            paper_id: paperId,
            ...progressData,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving progress:', error);
        throw error;
    }

    return data;
};

/**
 * Get user progress for a paper
 */
export const getUserProgress = async (userId, paperId) => {
    const { data, error } = await supabase
        .from('user_paper_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('paper_id', paperId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching progress:', error);
        throw error;
    }

    return data;
};

/**
 * Get all user progress
 */
export const getAllUserProgress = async (userId) => {
    const { data, error } = await supabase
        .from('user_paper_progress')
        .select(`
            *,
            papers (
                id,
                title,
                year,
                subject,
                exam_type
            )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching user progress:', error);
        throw error;
    }

    return data;
};

/**
 * Get statistics for a paper (how many users have attempted it)
 */
export const getPaperStats = async (paperId) => {
    const { data, error } = await supabase
        .from('user_paper_progress')
        .select('status, score')
        .eq('paper_id', paperId);

    if (error) {
        console.error('Error fetching paper stats:', error);
        throw error;
    }

    const stats = {
        totalAttempts: data.length,
        completed: data.filter(p => p.status === 'completed').length,
        inProgress: data.filter(p => p.status === 'in_progress').length,
        averageScore: data.length > 0
            ? data.reduce((sum, p) => sum + (p.score || 0), 0) / data.length
            : 0,
    };

    return stats;
};

export default supabase;