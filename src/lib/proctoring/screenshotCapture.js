/**
 * Screenshot Capture Service
 * Captures, compresses, and uploads screenshots on violations
 * @module screenshotCapture
 */

import { supabase } from '../supabase';

const JPEG_QUALITY = 0.6;    // 60% quality (good balance of size/clarity)
const MAX_WIDTH = 640;
const MAX_HEIGHT = 480;

/**
 * Capture a screenshot from the video element
 * @param {HTMLVideoElement} videoElement
 * @returns {Blob|null} - Compressed JPEG blob
 */
export function captureScreenshot(videoElement) {
    if (!videoElement || videoElement.readyState < 2) {
        return null;
    }

    try {
        const canvas = document.createElement('canvas');

        // Calculate dimensions maintaining aspect ratio
        let width = videoElement.videoWidth || 640;
        let height = videoElement.videoHeight || 480;

        if (width > MAX_WIDTH) {
            height = Math.round((MAX_WIDTH / width) * height);
            width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
            width = Math.round((MAX_HEIGHT / height) * width);
            height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, width, height);

        // Add timestamp overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, height - 24, width, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(new Date().toISOString(), 6, height - 8);

        // Convert to compressed JPEG blob
        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                'image/jpeg',
                JPEG_QUALITY
            );
        });
    } catch (err) {
        console.error('Screenshot capture error:', err);
        return null;
    }
}

/**
 * Upload screenshot to Supabase Storage
 * @param {Blob} blob - Screenshot blob
 * @param {string} userId - User ID
 * @param {string} sessionId - Proctoring session ID
 * @param {string} violationType - Type of violation
 * @returns {Promise<string|null>} - Public URL or null on failure
 */
export async function uploadScreenshot(blob, userId, sessionId, violationType) {
    if (!blob || !userId || !sessionId) return null;

    try {
        const timestamp = Date.now();
        const fileName = `${userId}/${sessionId}/${violationType}_${timestamp}.jpg`;

        const { data, error } = await supabase.storage
            .from('proctoring-screenshots')
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Screenshot upload error:', error);
            return null;
        }

        // Get signed URL (valid for 7 days)
        const { data: urlData } = await supabase.storage
            .from('proctoring-screenshots')
            .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days

        return urlData?.signedUrl || null;
    } catch (err) {
        console.error('Screenshot upload failed:', err);
        return null;
    }
}

/**
 * Capture and upload in one step
 * @param {HTMLVideoElement} videoElement
 * @param {string} userId
 * @param {string} sessionId
 * @param {string} violationType
 * @returns {Promise<string|null>} - Screenshot URL or null
 */
export async function captureAndUpload(videoElement, userId, sessionId, violationType) {
    const blob = await captureScreenshot(videoElement);
    if (!blob) return null;

    return uploadScreenshot(blob, userId, sessionId, violationType);
}

/**
 * Delete old screenshots for a user
 * @param {string} userId
 * @returns {Promise<number>} - Number of deleted files
 */
export async function cleanupOldScreenshots(userId) {
    if (!userId) return 0;

    try {
        const { data: files, error } = await supabase.storage
            .from('proctoring-screenshots')
            .list(userId, { limit: 1000 });

        if (error || !files) return 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const oldFiles = files.filter(f => {
            const fileDate = new Date(f.created_at);
            return fileDate < thirtyDaysAgo;
        });

        if (oldFiles.length === 0) return 0;

        const filePaths = oldFiles.map(f => `${userId}/${f.name}`);
        const { error: deleteError } = await supabase.storage
            .from('proctoring-screenshots')
            .remove(filePaths);

        if (deleteError) {
            console.error('Screenshot cleanup error:', deleteError);
            return 0;
        }

        return oldFiles.length;
    } catch (err) {
        console.error('Screenshot cleanup failed:', err);
        return 0;
    }
}

/**
 * Get estimated storage usage for a user
 * @param {string} userId
 * @returns {Promise<{ count: number, estimatedSizeKB: number }>}
 */
export async function getStorageUsage(userId) {
    if (!userId) return { count: 0, estimatedSizeKB: 0 };

    try {
        const { data: files, error } = await supabase.storage
            .from('proctoring-screenshots')
            .list(userId, { limit: 1000 });

        if (error || !files) return { count: 0, estimatedSizeKB: 0 };

        // Each compressed screenshot is ~50KB
        return {
            count: files.length,
            estimatedSizeKB: files.length * 50
        };
    } catch {
        return { count: 0, estimatedSizeKB: 0 };
    }
}
