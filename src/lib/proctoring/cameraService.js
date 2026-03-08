/**
 * Camera Service - Handles camera/microphone access and stream management
 * @module cameraService
 */

let videoStream = null;
let audioStream = null;

/**
 * Request camera and microphone permissions
 * @returns {Promise<{video: MediaStream|null, audio: MediaStream|null, granted: boolean, error: string|null}>}
 */
export async function requestMediaPermissions() {
    try {
        // Request both video and audio in a single call for better UX
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                facingMode: 'user',
                frameRate: { ideal: 15, max: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });

        // Separate video and audio tracks
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        videoStream = new MediaStream(videoTracks);
        audioStream = new MediaStream(audioTracks);

        return {
            video: videoStream,
            audio: audioStream,
            granted: true,
            error: null
        };
    } catch (err) {
        console.error('Media permission error:', err);

        let errorMessage = 'Unknown error accessing camera/microphone.';

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = 'Camera/microphone permission denied. Please allow access in your browser settings and reload.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'No camera or microphone found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = 'Camera is being used by another application. Please close other apps using the camera.';
        } else if (err.name === 'OverconstrainedError') {
            errorMessage = 'Camera does not meet the required specifications. Trying with lower quality...';
            // Retry with lower constraints
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: true
                });
                const vTracks = fallbackStream.getVideoTracks();
                const aTracks = fallbackStream.getAudioTracks();
                videoStream = new MediaStream(vTracks);
                audioStream = new MediaStream(aTracks);
                return { video: videoStream, audio: audioStream, granted: true, error: null };
            } catch {
                errorMessage = 'Camera is not compatible. Please try a different camera.';
            }
        } else if (err.name === 'TypeError') {
            errorMessage = 'Browser does not support camera access. Please use Chrome, Firefox, or Edge.';
        }

        return { video: null, audio: null, granted: false, error: errorMessage };
    }
}

/**
 * Check current permission status without requesting
 * @returns {Promise<{camera: string, mic: string}>}
 */
export async function checkPermissionsStatus() {
    const result = { camera: 'prompt', mic: 'prompt' };

    try {
        if (navigator.permissions && navigator.permissions.query) {
            const [camPerm, micPerm] = await Promise.all([
                navigator.permissions.query({ name: 'camera' }).catch(() => ({ state: 'prompt' })),
                navigator.permissions.query({ name: 'microphone' }).catch(() => ({ state: 'prompt' }))
            ]);
            result.camera = camPerm.state;
            result.mic = micPerm.state;
        }
    } catch {
        // Permissions API not supported — leave as 'prompt'
    }

    return result;
}

/**
 * Get the current video stream
 * @returns {MediaStream|null}
 */
export function getVideoStream() {
    return videoStream;
}

/**
 * Get the current audio stream
 * @returns {MediaStream|null}
 */
export function getAudioStream() {
    return audioStream;
}

/**
 * Stop all media streams and release resources
 */
export function stopAllStreams() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
}

/**
 * Check camera quality (brightness and resolution)
 * @param {HTMLVideoElement} videoElement
 * @returns {{ quality: 'good'|'poor'|'dark', brightness: number, resolution: {width: number, height: number} }}
 */
export function checkCameraQuality(videoElement) {
    if (!videoElement || videoElement.readyState < 2) {
        return { quality: 'poor', brightness: 0, resolution: { width: 0, height: 0 } };
    }

    const canvas = document.createElement('canvas');
    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, width, height);

    // Sample pixels to check brightness
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let totalBrightness = 0;
    const sampleStep = 40; // Sample every 40th pixel for performance

    for (let i = 0; i < data.length; i += 4 * sampleStep) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
    }

    const avgBrightness = totalBrightness / (data.length / (4 * sampleStep));
    const normalizedBrightness = Math.round((avgBrightness / 255) * 100);

    let quality = 'good';
    if (normalizedBrightness < 20) quality = 'dark';
    else if (normalizedBrightness < 35 || width < 320) quality = 'poor';

    return {
        quality,
        brightness: normalizedBrightness,
        resolution: { width, height }
    };
}

/**
 * Check if the browser supports required media APIs
 * @returns {{ supported: boolean, missing: string[] }}
 */
export function checkBrowserSupport() {
    const missing = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        missing.push('Camera/Microphone API (getUserMedia)');
    }

    if (typeof window.MediaStream === 'undefined') {
        missing.push('MediaStream API');
    }

    return {
        supported: missing.length === 0,
        missing
    };
}
