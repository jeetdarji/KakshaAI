/**
 * Face Detection Service - MediaPipe Face Mesh
 * Detects face presence, count, eye gaze, and head pose
 * @module faceDetection
 */

let faceMesh = null;
let monitoringInterval = null;
let lastResults = null;
let isInitializing = false;

// Landmark indices for eye tracking (MediaPipe Face Mesh 468 landmarks)
const LEFT_EYE_IRIS = [468, 469, 470, 471, 472];
const RIGHT_EYE_IRIS = [473, 474, 475, 476, 477];
const LEFT_EYE_CORNERS = [33, 133]; // inner, outer
const RIGHT_EYE_CORNERS = [362, 263];
const NOSE_TIP = 1;
const FOREHEAD = 10;
const CHIN = 152;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

/**
 * Initialize MediaPipe Face Mesh
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<boolean>}
 */
export async function initializeFaceDetection(onProgress) {
    if (faceMesh) return true;
    if (isInitializing) return false;

    isInitializing = true;

    try {
        if (onProgress) onProgress('Loading face detection model...');

        const { FaceMesh } = await import('@mediapipe/face_mesh');

        faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 3,           // Detect up to 3 faces
            refineLandmarks: true,    // Enable iris tracking
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            selfieMode: true
        });

        faceMesh.onResults((results) => {
            lastResults = results;
        });

        if (onProgress) onProgress('Face detection ready');

        isInitializing = false;
        return true;
    } catch (err) {
        console.error('Failed to initialize Face Mesh:', err);
        isInitializing = false;
        return false;
    }
}

/**
 * Process a single video frame for face detection
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<Object>}
 */
export async function detectFaces(videoElement) {
    if (!faceMesh || !videoElement || videoElement.readyState < 2) {
        return { faces: [], count: 0 };
    }

    try {
        await faceMesh.send({ image: videoElement });

        // lastResults is updated by the onResults callback
        if (!lastResults || !lastResults.multiFaceLandmarks) {
            return { faces: [], count: 0 };
        }

        const faces = lastResults.multiFaceLandmarks.map((landmarks, index) => {
            const gaze = analyzeEyeGaze(landmarks);
            const headPose = analyzeHeadPose(landmarks);

            return {
                id: index,
                landmarks: landmarks.length,
                gaze,
                headPose,
                isLookingAtScreen: gaze.isLookingAtScreen,
                isLookingDown: headPose.isLookingDown,
                isLookingAway: headPose.isLookingAway
            };
        });

        return {
            faces,
            count: faces.length
        };
    } catch (err) {
        console.error('Face detection error:', err);
        return { faces: [], count: 0 };
    }
}

/**
 * Analyze eye gaze direction from face landmarks
 * @param {Array} landmarks - Face mesh landmarks
 * @returns {{ direction: string, isLookingAtScreen: boolean, horizontalRatio: number, verticalRatio: number }}
 */
function analyzeEyeGaze(landmarks) {
    try {
        // Calculate iris position relative to eye corners
        const leftIrisCenter = landmarks[468]; // Left iris center
        const rightIrisCenter = landmarks[473]; // Right iris center

        const leftInner = landmarks[LEFT_EYE_CORNERS[0]];
        const leftOuter = landmarks[LEFT_EYE_CORNERS[1]];
        const rightInner = landmarks[RIGHT_EYE_CORNERS[0]];
        const rightOuter = landmarks[RIGHT_EYE_CORNERS[1]];

        if (!leftIrisCenter || !rightIrisCenter) {
            return { direction: 'unknown', isLookingAtScreen: true, horizontalRatio: 0.5, verticalRatio: 0.5 };
        }

        // Horizontal gaze: ratio of iris position between eye corners
        const leftHorizontal = (leftIrisCenter.x - leftInner.x) / (leftOuter.x - leftInner.x);
        const rightHorizontal = (rightIrisCenter.x - rightInner.x) / (rightOuter.x - rightInner.x);
        const avgHorizontal = (leftHorizontal + rightHorizontal) / 2;

        // Vertical gaze using iris Y vs eye top/bottom
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const leftVertical = leftEyeTop && leftEyeBottom
            ? (leftIrisCenter.y - leftEyeTop.y) / (leftEyeBottom.y - leftEyeTop.y)
            : 0.5;

        // Determine direction
        let direction = 'center';
        if (avgHorizontal < 0.3) direction = 'left';
        else if (avgHorizontal > 0.7) direction = 'right';
        else if (leftVertical < 0.3) direction = 'up';
        else if (leftVertical > 0.7) direction = 'down';

        // Consider "looking at screen" if gaze is roughly centered
        const isLookingAtScreen = avgHorizontal > 0.25 && avgHorizontal < 0.75 &&
            leftVertical > 0.2 && leftVertical < 0.8;

        return {
            direction,
            isLookingAtScreen,
            horizontalRatio: Math.round(avgHorizontal * 100) / 100,
            verticalRatio: Math.round(leftVertical * 100) / 100
        };
    } catch {
        return { direction: 'unknown', isLookingAtScreen: true, horizontalRatio: 0.5, verticalRatio: 0.5 };
    }
}

/**
 * Analyze head pose from face landmarks
 * @param {Array} landmarks
 * @returns {{ pitch: string, yaw: string, isLookingDown: boolean, isLookingAway: boolean }}
 */
function analyzeHeadPose(landmarks) {
    try {
        const nose = landmarks[NOSE_TIP];
        const forehead = landmarks[FOREHEAD];
        const chin = landmarks[CHIN];
        const leftCheek = landmarks[LEFT_CHEEK];
        const rightCheek = landmarks[RIGHT_CHEEK];

        if (!nose || !forehead || !chin || !leftCheek || !rightCheek) {
            return { pitch: 'neutral', yaw: 'center', isLookingDown: false, isLookingAway: false };
        }

        // Pitch (up/down): compare nose position relative to forehead-chin midpoint
        const faceCenterY = (forehead.y + chin.y) / 2;
        const pitchRatio = (nose.y - forehead.y) / (chin.y - forehead.y);

        let pitch = 'neutral';
        if (pitchRatio > 0.6) pitch = 'down';
        else if (pitchRatio < 0.35) pitch = 'up';

        // Yaw (left/right): compare nose X position relative to cheek midpoint
        const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
        const yawOffset = nose.x - faceCenterX;

        let yaw = 'center';
        if (yawOffset < -0.04) yaw = 'right'; // Mirror due to selfie mode
        else if (yawOffset > 0.04) yaw = 'left';

        const isLookingDown = pitch === 'down';
        const isLookingAway = yaw !== 'center' || pitch === 'up';

        return { pitch, yaw, isLookingDown, isLookingAway };
    } catch {
        return { pitch: 'neutral', yaw: 'center', isLookingDown: false, isLookingAway: false };
    }
}

/**
 * Analyze face detection results for violations
 * @param {Object} faceData - Output from detectFaces
 * @returns {{ hasViolation: boolean, violations: Array }}
 */
export function analyzeFaceViolations(faceData) {
    const violations = [];

    if (faceData.count === 0) {
        violations.push({
            type: 'no_face',
            severity: 'high',
            description: 'No face detected in camera frame. Please ensure your face is visible.',
            confidence: 1,
            metadata: { faceCount: 0 }
        });
    }

    if (faceData.count > 1) {
        violations.push({
            type: 'multiple_people',
            severity: 'high',
            description: `${faceData.count} faces detected. Only 1 person should be visible.`,
            confidence: 0.9,
            metadata: { faceCount: faceData.count }
        });
    }

    if (faceData.count === 1) {
        const face = faceData.faces[0];

        if (face.isLookingAway) {
            violations.push({
                type: 'looking_away',
                severity: 'medium',
                description: `Student appears to be looking ${face.headPose.yaw !== 'center' ? face.headPose.yaw : face.headPose.pitch}`,
                confidence: 0.7,
                metadata: {
                    gazeDirection: face.gaze.direction,
                    headPose: face.headPose
                }
            });
        }

        if (face.isLookingDown) {
            violations.push({
                type: 'looking_away',
                severity: 'medium',
                description: 'Student appears to be looking down (possible phone/paper use)',
                confidence: 0.75,
                metadata: {
                    gazeDirection: 'down',
                    headPose: face.headPose
                }
            });
        }
    }

    return {
        hasViolation: violations.length > 0,
        violations
    };
}

/**
 * Start continuous face monitoring
 * @param {HTMLVideoElement} videoElement
 * @param {function} onViolation - Callback: (violation) => void
 * @param {number} intervalMs - Detection interval (default: 2000ms)
 */
export function startFaceMonitoring(videoElement, onViolation, intervalMs = 2000) {
    stopFaceMonitoring();

    // Tracking for sustained violations only
    let consecutiveNoFace = 0;
    let consecutiveLookAway = 0;
    const THRESHOLD = 2; // Need consecutive detections to trigger

    monitoringInterval = setInterval(async () => {
        const faceData = await detectFaces(videoElement);
        const analysis = analyzeFaceViolations(faceData);

        if (faceData.count === 0) {
            consecutiveNoFace++;
            if (consecutiveNoFace >= THRESHOLD) {
                const noFaceViolation = analysis.violations.find(v => v.type === 'no_face');
                if (noFaceViolation) onViolation(noFaceViolation);
                consecutiveNoFace = 0; // Reset after reporting
            }
        } else {
            consecutiveNoFace = 0;
        }

        if (faceData.count === 1 && faceData.faces[0].isLookingAway) {
            consecutiveLookAway++;
            if (consecutiveLookAway >= THRESHOLD + 1) { // Higher threshold for gaze
                const lookViolation = analysis.violations.find(v => v.type === 'looking_away');
                if (lookViolation) onViolation(lookViolation);
                consecutiveLookAway = 0;
            }
        } else {
            consecutiveLookAway = 0;
        }

        // Multiple faces is always immediate
        if (faceData.count > 1) {
            const multiViolation = analysis.violations.find(v => v.type === 'multiple_people');
            if (multiViolation) onViolation(multiViolation);
        }
    }, intervalMs);
}

/**
 * Stop continuous face monitoring
 */
export function stopFaceMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
}

/**
 * Check if face detection is ready
 * @returns {boolean}
 */
export function isFaceDetectionReady() {
    return faceMesh !== null;
}

/**
 * Dispose face mesh and free resources
 */
export function disposeFaceDetection() {
    stopFaceMonitoring();
    if (faceMesh) {
        faceMesh.close();
        faceMesh = null;
    }
    lastResults = null;
}
