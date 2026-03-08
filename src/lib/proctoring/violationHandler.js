/**
 * Violation Handler - Manages violation logging, warnings, and strike system
 * @module violationHandler
 */

import { supabase } from '../supabase';

const MAX_STRIKES = 3;
const VIOLATION_COOLDOWN = 8000; // 8 seconds cooldown between same violation types

// Track violation timing to prevent spam
const recentViolations = new Map(); // type -> lastTimestamp

/**
 * Create a new proctoring session
 * @param {string} userId
 * @param {number} testId
 * @param {boolean} cameraEnabled
 * @param {boolean} micEnabled
 * @returns {Promise<Object|null>} - Session data
 */
export async function createProctoringSession(userId, testId, cameraEnabled, micEnabled) {
    try {
        const { data, error } = await supabase
            .from('proctoring_sessions')
            .insert({
                user_id: userId,
                test_id: testId,
                camera_enabled: cameraEnabled,
                mic_enabled: micEnabled,
                consent_given: true,
                consent_timestamp: new Date().toISOString(),
                proctoring_status: 'active'
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create proctoring session:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Proctoring session creation error:', err);
        return null;
    }
}

/**
 * Log a violation to the database
 * @param {Object} violation - Violation data
 * @param {string} sessionId - Proctoring session ID
 * @param {string} userId - User ID
 * @param {string|null} screenshotUrl - Optional screenshot URL
 * @returns {Promise<Object|null>}
 */
export async function logViolation(violation, sessionId, userId, screenshotUrl = null) {
    // Check cooldown
    const now = Date.now();
    const lastTime = recentViolations.get(violation.type) || 0;

    if (now - lastTime < VIOLATION_COOLDOWN) {
        return null; // Skip — too soon after same type
    }
    recentViolations.set(violation.type, now);

    try {
        const { data, error } = await supabase
            .from('proctoring_violations')
            .insert({
                session_id: sessionId,
                user_id: userId,
                violation_type: violation.type,
                severity: violation.severity,
                description: violation.description,
                screenshot_url: screenshotUrl,
                confidence_score: violation.confidence,
                metadata: violation.metadata || {}
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to log violation:', error);
            return null;
        }

        // Update session violation count by fetching current + 1
        try {
            const { data: session } = await supabase
                .from('proctoring_sessions')
                .select('total_violations')
                .eq('id', sessionId)
                .single();

            const currentCount = session?.total_violations || 0;
            await supabase
                .from('proctoring_sessions')
                .update({ total_violations: currentCount + 1 })
                .eq('id', sessionId);
        } catch (e) {
            console.warn('Failed to increment violation count:', e);
        }

        return data;
    } catch (err) {
        console.error('Violation logging error:', err);
        return null;
    }
}

/**
 * Process a violation through the strike system
 * @param {Object} violation - Violation data
 * @param {number} currentStrikes - Current strike count
 * @returns {{ action: 'warn'|'alert'|'terminate', strikeCount: number, message: string }}
 */
export function processViolation(violation, currentStrikes) {
    const newStrikes = currentStrikes + (violation.severity === 'high' ? 1 : 0.5);
    const roundedStrikes = Math.ceil(newStrikes);

    if (roundedStrikes >= MAX_STRIKES) {
        return {
            action: 'terminate',
            strikeCount: roundedStrikes,
            message: `Maximum violations reached (${roundedStrikes}/${MAX_STRIKES}). Your test will be auto-submitted.`
        };
    }

    if (roundedStrikes >= MAX_STRIKES - 1) {
        return {
            action: 'alert',
            strikeCount: roundedStrikes,
            message: `Warning ${roundedStrikes}/${MAX_STRIKES}: ${violation.description}. One more violation will end your test!`
        };
    }

    return {
        action: 'warn',
        strikeCount: roundedStrikes,
        message: `Warning ${roundedStrikes}/${MAX_STRIKES}: ${violation.description}`
    };
}

/**
 * End a proctoring session
 * @param {string} sessionId
 * @param {string} status - 'completed' or 'terminated'
 * @param {string|null} submissionId - Optional submission ID
 */
export async function endProctoringSession(sessionId, status = 'completed', submissionId = null, totalViolations = null) {
    if (!sessionId) return;

    try {
        const updateData = {
            proctoring_status: status,
            ended_at: new Date().toISOString()
        };

        if (submissionId) {
            updateData.submission_id = submissionId;
        }

        // Always save the final accurate violation count if provided
        if (totalViolations !== null) {
            updateData.total_violations = totalViolations;
        }

        await supabase
            .from('proctoring_sessions')
            .update(updateData)
            .eq('id', sessionId);
    } catch (err) {
        console.error('Failed to end proctoring session:', err);
    }
}

/**
 * Get violations for a specific session
 * @param {string} sessionId
 * @returns {Promise<Array>}
 */
export async function getSessionViolations(sessionId) {
    try {
        const { data, error } = await supabase
            .from('proctoring_violations')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch violations:', err);
        return [];
    }
}

/**
 * Get proctoring session for a test
 * @param {string} userId
 * @param {number} testId
 * @returns {Promise<Object|null>}
 */
export async function getSessionForTest(userId, testId) {
    try {
        const { data, error } = await supabase
            .from('proctoring_sessions')
            .select('*, proctoring_violations(*)')
            .eq('user_id', userId)
            .eq('test_id', testId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) return null;
        return data;
    } catch {
        return null;
    }
}

/**
 * Get violation severity color
 * @param {string} severity
 * @returns {string}
 */
export function getSeverityColor(severity) {
    switch (severity) {
        case 'high': return 'text-red-400';
        case 'medium': return 'text-amber-400';
        case 'low': return 'text-yellow-300';
        default: return 'text-gray-400';
    }
}

/**
 * Get violation type display name
 * @param {string} type
 * @returns {string}
 */
export function getViolationTypeLabel(type) {
    const labels = {
        'phone_detected': 'Phone Detected',
        'multiple_people': 'Multiple People',
        'no_face': 'Face Not Visible',
        'looking_away': 'Looking Away',
        'suspicious_audio': 'Suspicious Audio',
        'book_detected': 'Book Detected',
        'laptop_detected': 'Laptop Detected',
        'tab_switch': 'Tab Switch'
    };
    return labels[type] || type;
}

/**
 * Get violation type icon name (for lucide-react)
 * @param {string} type
 * @returns {string}
 */
export function getViolationIcon(type) {
    const icons = {
        'phone_detected': 'Smartphone',
        'multiple_people': 'Users',
        'no_face': 'UserX',
        'looking_away': 'Eye',
        'suspicious_audio': 'Volume2',
        'book_detected': 'BookOpen',
        'laptop_detected': 'Laptop',
        'tab_switch': 'Monitor'
    };
    return icons[type] || 'AlertTriangle';
}
