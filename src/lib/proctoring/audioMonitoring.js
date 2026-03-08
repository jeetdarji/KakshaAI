/**
 * Audio Monitoring Service - Web Speech API
 * Real-time speech detection for suspicious conversation monitoring
 * @module audioMonitoring
 */

let recognition = null;
let isListening = false;
let onViolationCallback = null;

// Suspicious keywords that indicate cheating
const SUSPICIOUS_KEYWORDS = [
    // Direct cheating
    'answer', 'answers', 'option', 'correct', 'wrong',
    // Seeking help
    'help', 'tell me', 'what is', 'which one', 'kaunsa', 'bata', 'batao',
    // Technology-assisted
    'google', 'search', 'chatgpt', 'ai', 'siri', 'alexa',
    // Collaboration
    'hey', 'listen', 'look', 'come here', 'show me', 'idhar dekh',
    // Test-specific
    'question number', 'next question', 'previous', 'mark',
    // Hindi equivalents
    'jawab', 'sahi', 'galat', 'madad', 'dekhle', 'padh'
];

// Confidence threshold - keywords must appear in spoken text
const DETECTION_COOLDOWN = 15000; // 15 seconds between alerts (prevent spam)
let lastAlertTime = 0;

/**
 * Check if Web Speech API is supported
 * @returns {boolean}
 */
export function isSpeechRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Initialize audio monitoring with speech recognition
 * @param {function} onViolation - Callback when suspicious speech detected
 * @returns {boolean} - Whether initialization succeeded
 */
export function initializeAudioMonitoring(onViolation) {
    if (!isSpeechRecognitionSupported()) {
        console.warn('Speech Recognition API not supported in this browser');
        return false;
    }

    onViolationCallback = onViolation;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    recognition.continuous = true;       // Keep listening
    recognition.interimResults = true;   // Get partial results
    recognition.lang = 'en-IN';          // Indian English (also catches Hindi)
    recognition.maxAlternatives = 1;

    recognition.onresult = handleSpeechResult;

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            // Expected — no one is talking, restart
            return;
        }
        if (event.error === 'aborted') {
            // Manual stop, don't restart
            return;
        }
        console.warn('Speech recognition error:', event.error);

        // Auto-restart on network/service errors
        if (isListening && event.error !== 'not-allowed') {
            setTimeout(() => {
                if (isListening) restartRecognition();
            }, 1000);
        }
    };

    recognition.onend = () => {
        // Auto-restart if we're still supposed to be listening
        if (isListening) {
            setTimeout(() => {
                if (isListening) restartRecognition();
            }, 500);
        }
    };

    return true;
}

/**
 * Handle speech recognition results
 * @param {SpeechRecognitionEvent} event
 */
function handleSpeechResult(event) {
    const now = Date.now();

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.toLowerCase().trim();
        const confidence = result[0].confidence;

        if (!transcript || transcript.length < 2) continue;

        // Check for suspicious keywords
        const matchedKeywords = findSuspiciousKeywords(transcript);

        if (matchedKeywords.length > 0 && (now - lastAlertTime) > DETECTION_COOLDOWN) {
            lastAlertTime = now;

            const isFinal = result.isFinal;

            if (onViolationCallback) {
                onViolationCallback({
                    type: 'suspicious_audio',
                    severity: matchedKeywords.length >= 2 ? 'high' : 'medium',
                    description: `Suspicious speech detected: "${transcript.substring(0, 80)}"`,
                    confidence: confidence || 0.7,
                    metadata: {
                        transcript: transcript.substring(0, 200),
                        matchedKeywords,
                        isFinal,
                        speechConfidence: confidence
                    }
                });
            }
        }

        // Also detect any sustained talking (even without keywords)
        if (result.isFinal && transcript.length > 20 && (now - lastAlertTime) > DETECTION_COOLDOWN * 2) {
            lastAlertTime = now;

            if (onViolationCallback) {
                onViolationCallback({
                    type: 'suspicious_audio',
                    severity: 'low',
                    description: 'Extended conversation detected during test',
                    confidence: 0.5,
                    metadata: {
                        transcript: transcript.substring(0, 200),
                        matchedKeywords: [],
                        reason: 'sustained_speech'
                    }
                });
            }
        }
    }
}

/**
 * Find suspicious keywords in transcript
 * @param {string} transcript - Lowercase transcript text
 * @returns {string[]} - Matched keywords
 */
function findSuspiciousKeywords(transcript) {
    return SUSPICIOUS_KEYWORDS.filter(keyword =>
        transcript.includes(keyword.toLowerCase())
    );
}

/**
 * Start audio monitoring
 * @returns {boolean} - Whether start was successful
 */
export function startAudioMonitoring() {
    if (!recognition) {
        console.warn('Audio monitoring not initialized');
        return false;
    }

    if (isListening) return true;

    try {
        recognition.start();
        isListening = true;
        return true;
    } catch (err) {
        console.error('Failed to start speech recognition:', err);
        // May already be running
        if (err.message?.includes('already started')) {
            isListening = true;
            return true;
        }
        return false;
    }
}

/**
 * Stop audio monitoring
 */
export function stopAudioMonitoring() {
    isListening = false;

    if (recognition) {
        try {
            recognition.stop();
        } catch {
            // Already stopped
        }
    }
}

/**
 * Restart speech recognition (handles browser auto-stop)
 */
function restartRecognition() {
    if (!recognition || !isListening) return;

    try {
        recognition.stop();
    } catch {
        // Already stopped
    }

    setTimeout(() => {
        if (isListening && recognition) {
            try {
                recognition.start();
            } catch (err) {
                console.warn('Failed to restart speech recognition:', err);
            }
        }
    }, 200);
}

/**
 * Check if audio monitoring is currently active
 * @returns {boolean}
 */
export function isAudioMonitoringActive() {
    return isListening;
}

/**
 * Dispose audio monitoring resources
 */
export function disposeAudioMonitoring() {
    stopAudioMonitoring();
    recognition = null;
    onViolationCallback = null;
    lastAlertTime = 0;
}
