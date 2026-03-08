/**
 * Proctoring Service - Main Orchestrator
 * Coordinates all proctoring subsystems (camera, object detection, face detection, audio)
 * @module proctoringService
 */

import { requestMediaPermissions, stopAllStreams, checkBrowserSupport } from './cameraService';
import { initializeObjectDetection, startObjectMonitoring, stopObjectMonitoring, disposeModel } from './objectDetection';
import { initializeFaceDetection, startFaceMonitoring, stopFaceMonitoring, disposeFaceDetection } from './faceDetection';
import { initializeAudioMonitoring, startAudioMonitoring, stopAudioMonitoring, disposeAudioMonitoring, isSpeechRecognitionSupported } from './audioMonitoring';
import { captureAndUpload } from './screenshotCapture';
import { createProctoringSession, logViolation, processViolation, endProctoringSession } from './violationHandler';

// Multiple people: warn 2 times, 3rd time = auto-submit
const MULTIPLE_PEOPLE_MAX_WARNINGS = 2;

// Proctoring state
let proctoringState = {
    isActive: false,
    sessionId: null,
    userId: null,
    testId: null,
    videoElement: null,
    strikes: 0,
    violations: [],
    multiplePeopleCount: 0, // Track multiple_people violations separately
    onViolation: null,
    onTerminate: null,
    onStatusChange: null,
    modelsLoaded: {
        objectDetection: false,
        faceDetection: false,
        audioMonitoring: false
    }
};

/**
 * Initialize all proctoring systems
 * @param {Object} config
 * @param {string} config.userId
 * @param {number} config.testId
 * @param {HTMLVideoElement} config.videoElement
 * @param {function} config.onViolation - (violation, result) => void
 * @param {function} config.onTerminate - () => void (auto-submit callback)
 * @param {function} config.onStatusChange - (status) => void
 * @param {function} config.onProgress - (message) => void
 * @returns {Promise<{ success: boolean, session: Object|null, errors: string[] }>}
 */
export async function initializeProctoring(config) {
    const errors = [];

    // Check browser support first
    const browserSupport = checkBrowserSupport();
    if (!browserSupport.supported) {
        return {
            success: false,
            session: null,
            errors: [`Browser not supported: Missing ${browserSupport.missing.join(', ')}`]
        };
    }

    // Store config
    proctoringState.userId = config.userId;
    proctoringState.testId = config.testId;
    proctoringState.videoElement = config.videoElement;
    proctoringState.onViolation = config.onViolation;
    proctoringState.onTerminate = config.onTerminate;
    proctoringState.onStatusChange = config.onStatusChange;
    proctoringState.strikes = 0;
    proctoringState.violations = [];

    const onProgress = config.onProgress || (() => { });

    // 1. Request camera/mic permissions
    onProgress('Requesting camera permissions...');
    const media = await requestMediaPermissions();

    if (!media.granted) {
        errors.push(media.error || 'Camera/microphone permission denied');
    }

    // 2. Initialize object detection (TensorFlow.js + COCO-SSD)
    onProgress('Loading AI object detection...');
    try {
        const objDetReady = await initializeObjectDetection(onProgress);
        proctoringState.modelsLoaded.objectDetection = objDetReady;
        if (!objDetReady) errors.push('Object detection model failed to load');
    } catch (err) {
        errors.push('Object detection initialization error');
        console.error(err);
    }

    // 3. Initialize face detection (MediaPipe Face Mesh)
    onProgress('Loading face detection...');
    try {
        const faceReady = await initializeFaceDetection(onProgress);
        proctoringState.modelsLoaded.faceDetection = faceReady;
        if (!faceReady) errors.push('Face detection model failed to load');
    } catch (err) {
        errors.push('Face detection initialization error');
        console.error(err);
    }

    // 4. Initialize audio monitoring
    if (isSpeechRecognitionSupported()) {
        onProgress('Setting up audio monitoring...');
        const audioReady = initializeAudioMonitoring(handleViolation);
        proctoringState.modelsLoaded.audioMonitoring = audioReady;
        if (!audioReady) errors.push('Audio monitoring setup failed');
    } else {
        errors.push('Speech recognition not supported in this browser');
    }

    // 5. Create proctoring session in database
    onProgress('Creating proctoring session...');
    const session = await createProctoringSession(
        config.userId,
        config.testId,
        media.granted,
        proctoringState.modelsLoaded.audioMonitoring
    );

    if (session) {
        proctoringState.sessionId = session.id;
    } else {
        errors.push('Failed to create proctoring session');
    }

    // At least object detection or face detection must work
    const hasMinimumCapability = proctoringState.modelsLoaded.objectDetection ||
        proctoringState.modelsLoaded.faceDetection;

    onProgress('Proctoring system ready');

    return {
        success: media.granted && hasMinimumCapability,
        session,
        errors,
        capabilities: { ...proctoringState.modelsLoaded }
    };
}

/**
 * Start all monitoring systems
 * @param {HTMLVideoElement} videoElement
 */
export function startProctoring(videoElement) {
    if (proctoringState.isActive) return;

    proctoringState.isActive = true;
    proctoringState.videoElement = videoElement || proctoringState.videoElement;

    const video = proctoringState.videoElement;

    // Start object detection monitoring (every 3 seconds)
    if (proctoringState.modelsLoaded.objectDetection && video) {
        startObjectMonitoring(video, handleViolation, 3000);
    }

    // Start face monitoring (every 2 seconds)
    if (proctoringState.modelsLoaded.faceDetection && video) {
        startFaceMonitoring(video, handleViolation, 2000);
    }

    // Start audio monitoring
    if (proctoringState.modelsLoaded.audioMonitoring) {
        startAudioMonitoring();
    }

    updateStatus('monitoring');
}

/**
 * Central violation handler - processes all violations from all subsystems
 * @param {Object} violation
 */
async function handleViolation(violation) {
    if (!proctoringState.isActive) return;

    // Special handling for multiple_people: 2 warnings, then auto-submit on 3rd
    if (violation.type === 'multiple_people') {
        proctoringState.multiplePeopleCount++;

        const count = proctoringState.multiplePeopleCount;

        // Build a custom result for multiple_people
        let result;
        if (count > MULTIPLE_PEOPLE_MAX_WARNINGS) {
            // 3rd+ detection → terminate
            result = {
                action: 'terminate',
                strikeCount: proctoringState.strikes + 1,
                message: `Multiple people detected ${count} times. Maximum warnings exceeded — your test will be auto-submitted.`
            };
            proctoringState.strikes = result.strikeCount;
        } else {
            // 1st or 2nd detection → warn
            result = {
                action: count === MULTIPLE_PEOPLE_MAX_WARNINGS ? 'alert' : 'warn',
                strikeCount: proctoringState.strikes,
                message: `Warning ${count}/${MULTIPLE_PEOPLE_MAX_WARNINGS}: ${violation.description}${count === MULTIPLE_PEOPLE_MAX_WARNINGS ? '. Next detection will auto-submit your test!' : ''}`
            };
        }

        const violationRecord = {
            ...violation,
            timestamp: new Date().toISOString(),
            strikeCount: result.strikeCount
        };
        proctoringState.violations.push(violationRecord);

        // Capture screenshot
        let screenshotUrl = null;
        if (proctoringState.videoElement) {
            screenshotUrl = await captureAndUpload(
                proctoringState.videoElement,
                proctoringState.userId,
                proctoringState.sessionId,
                violation.type
            );
        }

        // Log to database
        if (proctoringState.sessionId) {
            await logViolation(violation, proctoringState.sessionId, proctoringState.userId, screenshotUrl);
        }

        // Notify UI
        if (proctoringState.onViolation) {
            proctoringState.onViolation(violationRecord, result);
        }

        // Terminate if needed
        if (result.action === 'terminate') {
            await stopProctoring('terminated');
            if (proctoringState.onTerminate) {
                proctoringState.onTerminate();
            }
        }
        return; // Don't fall through to normal processing
    }

    // Normal strike system for all other violation types
    const result = processViolation(violation, proctoringState.strikes);
    proctoringState.strikes = result.strikeCount;

    // add to local violations list
    const violationRecord = {
        ...violation,
        timestamp: new Date().toISOString(),
        strikeCount: result.strikeCount
    };
    proctoringState.violations.push(violationRecord);

    // Capture screenshot for high/medium severity
    let screenshotUrl = null;
    if (violation.severity !== 'low' && proctoringState.videoElement) {
        screenshotUrl = await captureAndUpload(
            proctoringState.videoElement,
            proctoringState.userId,
            proctoringState.sessionId,
            violation.type
        );
    }

    // Log to database
    if (proctoringState.sessionId) {
        await logViolation(
            violation,
            proctoringState.sessionId,
            proctoringState.userId,
            screenshotUrl
        );
    }

    // Notify the UI component
    if (proctoringState.onViolation) {
        proctoringState.onViolation(violationRecord, result);
    }

    // Handle termination
    if (result.action === 'terminate') {
        await stopProctoring('terminated');
        if (proctoringState.onTerminate) {
            proctoringState.onTerminate();
        }
    }
}

/**
 * Stop all proctoring systems
 * @param {string} reason - 'completed' or 'terminated'
 */
export async function stopProctoring(reason = 'completed') {
    proctoringState.isActive = false;

    // Stop all monitors
    stopObjectMonitoring();
    stopFaceMonitoring();
    stopAudioMonitoring();

    // Stop media streams
    stopAllStreams();

    // End session in database with actual violation count
    if (proctoringState.sessionId) {
        await endProctoringSession(proctoringState.sessionId, reason, null, proctoringState.violations.length);
    }

    updateStatus('stopped');
}

/**
 * Pause proctoring temporarily (e.g., during section transitions)
 */
export function pauseProctoring() {
    stopObjectMonitoring();
    stopFaceMonitoring();
    stopAudioMonitoring();
    updateStatus('paused');
}

/**
 * Resume proctoring after pause
 * @param {HTMLVideoElement} videoElement
 */
export function resumeProctoring(videoElement) {
    const video = videoElement || proctoringState.videoElement;

    if (proctoringState.modelsLoaded.objectDetection && video) {
        startObjectMonitoring(video, handleViolation, 3000);
    }

    if (proctoringState.modelsLoaded.faceDetection && video) {
        startFaceMonitoring(video, handleViolation, 2000);
    }

    if (proctoringState.modelsLoaded.audioMonitoring) {
        startAudioMonitoring();
    }

    updateStatus('monitoring');
}

/**
 * Get current proctoring status
 * @returns {Object}
 */
export function getProctoringStatus() {
    return {
        isActive: proctoringState.isActive,
        sessionId: proctoringState.sessionId,
        strikes: proctoringState.strikes,
        maxStrikes: 3,
        violationCount: proctoringState.violations.length,
        violations: proctoringState.violations,
        models: proctoringState.modelsLoaded
    };
}

/**
 * Update status and notify listener
 * @param {string} status
 */
function updateStatus(status) {
    if (proctoringState.onStatusChange) {
        proctoringState.onStatusChange(status);
    }
}

/**
 * Dispose all resources completely
 */
export function disposeProctoring() {
    stopProctoring('completed');
    disposeModel();
    disposeFaceDetection();
    disposeAudioMonitoring();

    proctoringState = {
        isActive: false,
        sessionId: null,
        userId: null,
        testId: null,
        videoElement: null,
        strikes: 0,
        violations: [],
        multiplePeopleCount: 0,
        onViolation: null,
        onTerminate: null,
        onStatusChange: null,
        modelsLoaded: {
            objectDetection: false,
            faceDetection: false,
            audioMonitoring: false
        }
    };
}

/**
 * Add a manual tab switch violation
 */
export function reportTabSwitch() {
    if (!proctoringState.isActive) return;

    handleViolation({
        type: 'tab_switch',
        severity: 'high',
        description: 'Tab switch or window minimize detected',
        confidence: 1,
        metadata: { source: 'visibilitychange' }
    });
}
