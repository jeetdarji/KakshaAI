/**
 * Object Detection Service - TensorFlow.js + COCO-SSD
 * Detects phones, multiple people, books, laptops in camera frame
 * @module objectDetection
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;
let monitoringInterval = null;
let isModelLoading = false;

// COCO-SSD classes we care about
const PHONE_CLASSES = ['cell phone', 'remote'];
const PERSON_CLASS = 'person';
const BOOK_CLASSES = ['book'];
const LAPTOP_CLASSES = ['laptop'];
const SUSPICIOUS_OBJECTS = [...PHONE_CLASSES, ...BOOK_CLASSES, ...LAPTOP_CLASSES];

/**
 * Initialize the COCO-SSD model
 * Downloads ~30MB model on first load (cached by browser afterward)
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<boolean>} - Whether initialization succeeded
 */
export async function initializeObjectDetection(onProgress) {
    if (model) return true;
    if (isModelLoading) return false;

    isModelLoading = true;
    try {
        // Set TensorFlow.js backend
        await tf.setBackend('webgl');
        await tf.ready();

        if (onProgress) onProgress('Loading AI model...');

        model = await cocoSsd.load({
            base: 'lite_mobilenet_v2' // Smaller, faster model variant
        });

        if (onProgress) onProgress('AI model loaded');

        isModelLoading = false;
        return true;
    } catch (err) {
        console.error('Failed to load COCO-SSD model:', err);
        isModelLoading = false;

        // Fallback: try with default base
        try {
            model = await cocoSsd.load();
            return true;
        } catch (fallbackErr) {
            console.error('Fallback model load also failed:', fallbackErr);
            return false;
        }
    }
}

/**
 * Detect all objects in a video frame
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<Array<{class: string, score: number, bbox: number[]}>>}
 */
export async function detectObjects(videoElement) {
    if (!model || !videoElement || videoElement.readyState < 2) {
        return [];
    }

    try {
        const predictions = await model.detect(videoElement, 10, 0.4);
        return predictions.map(p => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox // [x, y, width, height]
        }));
    } catch (err) {
        console.error('Object detection error:', err);
        return [];
    }
}

/**
 * Check for phone/mobile devices in predictions
 * @param {Array} predictions - Output from detectObjects
 * @returns {{ detected: boolean, confidence: number, count: number, items: Array }}
 */
export function checkForPhones(predictions) {
    const phones = predictions.filter(p =>
        PHONE_CLASSES.includes(p.class) && p.score > 0.45
    );

    return {
        detected: phones.length > 0,
        confidence: phones.length > 0 ? Math.max(...phones.map(p => p.score)) : 0,
        count: phones.length,
        items: phones
    };
}

/**
 * Check for multiple people in frame
 * @param {Array} predictions - Output from detectObjects
 * @returns {{ detected: boolean, count: number, items: Array }}
 */
export function checkForMultiplePeople(predictions) {
    const people = predictions.filter(p =>
        p.class === PERSON_CLASS && p.score > 0.5
    );

    return {
        detected: people.length > 1,
        count: people.length,
        items: people
    };
}

/**
 * Check for books in frame
 * @param {Array} predictions - Output from detectObjects
 * @returns {{ detected: boolean, count: number, items: Array }}
 */
export function checkForBooks(predictions) {
    const books = predictions.filter(p =>
        BOOK_CLASSES.includes(p.class) && p.score > 0.45
    );

    return {
        detected: books.length > 0,
        count: books.length,
        items: books
    };
}

/**
 * Check for laptop in frame
 * @param {Array} predictions - Output from detectObjects
 * @returns {{ detected: boolean, confidence: number, items: Array }}
 */
export function checkForLaptop(predictions) {
    const laptops = predictions.filter(p =>
        LAPTOP_CLASSES.includes(p.class) && p.score > 0.5
    );

    return {
        detected: laptops.length > 0,
        confidence: laptops.length > 0 ? Math.max(...laptops.map(p => p.score)) : 0,
        items: laptops
    };
}

/**
 * Analyze all predictions for any violations
 * @param {Array} predictions
 * @returns {{ hasViolation: boolean, violations: Array }}
 */
export function analyzeForViolations(predictions) {
    const violations = [];

    const phoneCheck = checkForPhones(predictions);
    if (phoneCheck.detected) {
        violations.push({
            type: 'phone_detected',
            severity: 'high',
            description: `Phone/mobile device detected (${Math.round(phoneCheck.confidence * 100)}% confidence)`,
            confidence: phoneCheck.confidence,
            metadata: { count: phoneCheck.count }
        });
    }

    const peopleCheck = checkForMultiplePeople(predictions);
    if (peopleCheck.detected) {
        violations.push({
            type: 'multiple_people',
            severity: 'high',
            description: `${peopleCheck.count} people detected in frame (should be 1)`,
            confidence: Math.max(...peopleCheck.items.map(p => p.score)),
            metadata: { count: peopleCheck.count }
        });
    }

    const bookCheck = checkForBooks(predictions);
    if (bookCheck.detected) {
        violations.push({
            type: 'book_detected',
            severity: 'medium',
            description: `Book/study material detected in frame`,
            confidence: Math.max(...bookCheck.items.map(p => p.score)),
            metadata: { count: bookCheck.count }
        });
    }

    return {
        hasViolation: violations.length > 0,
        violations
    };
}

/**
 * Start continuous object monitoring
 * @param {HTMLVideoElement} videoElement
 * @param {function} onViolation - Callback when violation detected: (violation) => void
 * @param {number} intervalMs - Detection interval in ms (default: 3000)
 */
export function startObjectMonitoring(videoElement, onViolation, intervalMs = 3000) {
    stopObjectMonitoring();

    monitoringInterval = setInterval(async () => {
        const predictions = await detectObjects(videoElement);
        const analysis = analyzeForViolations(predictions);

        if (analysis.hasViolation) {
            analysis.violations.forEach(violation => {
                onViolation(violation);
            });
        }
    }, intervalMs);
}

/**
 * Stop continuous monitoring
 */
export function stopObjectMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
}

/**
 * Check if the model is loaded and ready
 * @returns {boolean}
 */
export function isModelReady() {
    return model !== null;
}

/**
 * Dispose model and free memory
 */
export function disposeModel() {
    stopObjectMonitoring();
    if (model) {
        model = null;
    }
    // Clean TF.js memory
    try {
        tf.disposeVariables();
    } catch {
        // Ignore cleanup errors
    }
}
