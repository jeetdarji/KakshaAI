import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Shield, CheckCircle, XCircle, Loader, AlertTriangle, Eye } from 'lucide-react';
import { requestMediaPermissions, checkCameraQuality, checkBrowserSupport } from '../../lib/proctoring/cameraService';
import { initializeObjectDetection } from '../../lib/proctoring/objectDetection';
import { initializeFaceDetection } from '../../lib/proctoring/faceDetection';
import { isSpeechRecognitionSupported } from '../../lib/proctoring/audioMonitoring';

/**
 * ProctoringSetup - Pre-test proctoring setup screen
 * Compact single-page layout.
 * User must click "Enable Proctoring" to trigger browser permission popup.
 * Permissions are mandatory — cannot proceed without camera/mic.
 * After permissions granted, AI models load automatically, then consent + proceed.
 */
const ProctoringSetup = ({ onSetupComplete, onSkip, isDark }) => {
    const videoRef = useRef(null);
    // 'ask' = waiting for user to click enable
    // 'requesting' = browser popup is showing
    // 'loading' = permissions granted, loading AI models
    // 'ready' = everything loaded, show consent
    // 'denied' = permissions denied, show retry
    const [step, setStep] = useState('ask');
    const [progress, setProgress] = useState('');
    const [mediaStream, setMediaStream] = useState(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [deniedMessage, setDeniedMessage] = useState('');
    const [capabilities, setCapabilities] = useState({
        camera: null,   // null = pending, true = ok, false = failed
        mic: null,
        objectDetection: null,
        faceDetection: null,
        audioMonitoring: null
    });

    // Check browser support on mount
    useEffect(() => {
        const support = checkBrowserSupport();
        if (!support.supported) {
            setDeniedMessage(`Browser not supported: ${support.missing.join(', ')}`);
            setStep('denied');
        }
    }, []);

    // User clicks "Enable Proctoring" — triggers browser permission popup
    const handleEnableProctoring = async () => {
        setStep('requesting');
        setDeniedMessage('');
        setProgress('Waiting for camera & microphone permission...');

        try {
            const media = await requestMediaPermissions();

            if (media.granted) {
                setMediaStream(media.video);
                setCapabilities(prev => ({ ...prev, camera: true, mic: !!media.audio }));

                // Attach to video preview
                if (videoRef.current && media.video) {
                    videoRef.current.srcObject = media.video;
                    videoRef.current.play().catch(() => { });
                }

                // Now load AI models
                await loadAIModels();
            } else {
                setCapabilities(prev => ({ ...prev, camera: false, mic: false }));
                setDeniedMessage(media.error || 'Camera/microphone permission denied. You must allow access to proceed.');
                setStep('denied');
            }
        } catch {
            setCapabilities(prev => ({ ...prev, camera: false, mic: false }));
            setDeniedMessage('Failed to access camera/microphone. Please check your browser settings and try again.');
            setStep('denied');
        }
    };

    // Load AI models after permissions are granted
    const loadAIModels = async () => {
        setStep('loading');

        setProgress('Loading object detection AI...');
        try {
            const objReady = await initializeObjectDetection((msg) => setProgress(msg));
            setCapabilities(prev => ({ ...prev, objectDetection: objReady }));
        } catch {
            setCapabilities(prev => ({ ...prev, objectDetection: false }));
        }

        setProgress('Loading face detection AI...');
        try {
            const faceReady = await initializeFaceDetection((msg) => setProgress(msg));
            setCapabilities(prev => ({ ...prev, faceDetection: faceReady }));
        } catch {
            setCapabilities(prev => ({ ...prev, faceDetection: false }));
        }

        const audioSupported = isSpeechRecognitionSupported();
        setCapabilities(prev => ({ ...prev, audioMonitoring: audioSupported }));

        setStep('ready');
        setProgress('');
    };

    const handleProceed = () => {
        if (onSetupComplete) onSetupComplete(mediaStream);
    };

    const StatusDot = ({ state }) => {
        if (state === null) return <Loader className="w-4 h-4 text-teal-400 animate-spin flex-shrink-0" />;
        if (state === true) return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
        return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
    };

    const isLoading = step === 'requesting' || step === 'loading';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-3"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-bold text-white">AI Proctoring Setup</h2>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {/* Camera preview + System status */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Camera preview */}
                        <div className="relative rounded-lg overflow-hidden bg-gray-800 aspect-[4/3]">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            {!mediaStream && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                    <Camera className="w-8 h-8 text-gray-500" />
                                    <p className="text-gray-500 text-xs">Camera preview</p>
                                </div>
                            )}
                        </div>

                        {/* System status */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                            <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-teal-400" />
                                System Status
                            </h3>
                            <div className="space-y-1.5">
                                {[
                                    ['Camera', capabilities.camera],
                                    ['Microphone', capabilities.mic],
                                    ['Object Detection', capabilities.objectDetection],
                                    ['Face Tracking', capabilities.faceDetection],
                                    ['Audio Monitor', capabilities.audioMonitoring],
                                ].map(([label, state]) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <StatusDot state={state} />
                                        <span className={`text-xs ${state === false ? 'text-red-400' : 'text-gray-300'}`}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Progress (while requesting or loading models) */}
                    {isLoading && progress && (
                        <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2">
                            <Loader className="w-3.5 h-3.5 text-teal-400 animate-spin flex-shrink-0" />
                            <span className="text-teal-300 text-xs">{progress}</span>
                        </div>
                    )}

                    {/* Denied error message */}
                    {step === 'denied' && deniedMessage && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-red-300 text-xs">{deniedMessage}</span>
                        </div>
                    )}

                    {/* What is monitored */}
                    <div className="bg-gray-800/30 border border-gray-700 rounded-lg px-3 py-2">
                        <h3 className="text-white text-xs font-semibold mb-1.5">Monitored during test</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                            {['Phone detection', 'Multiple people', 'Face visibility', 'Eye gaze', 'Head pose', 'Audio/speech'].map(item => (
                                <span key={item} className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"></span>
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* === ACTION AREA === */}

                    {/* Step: ask — user hasn't clicked enable yet */}
                    {step === 'ask' && (
                        <button
                            onClick={handleEnableProctoring}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Camera className="w-4 h-4" />
                            Enable Camera & Microphone
                        </button>
                    )}

                    {/* Step: denied — retry button */}
                    {step === 'denied' && (
                        <button
                            onClick={handleEnableProctoring}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Camera className="w-4 h-4" />
                            Retry — Allow Camera & Microphone
                        </button>
                    )}

                    {/* Step: requesting or loading — show loader */}
                    {isLoading && (
                        <div className="w-full py-3 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium text-center flex items-center justify-center gap-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            {step === 'requesting' ? 'Waiting for permission...' : 'Loading AI models...'}
                        </div>
                    )}

                    {/* Step: ready — consent + proceed */}
                    {step === 'ready' && (
                        <>
                            <label className="flex items-start gap-2.5 cursor-pointer bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800/70 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={consentGiven}
                                    onChange={(e) => setConsentGiven(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 flex-shrink-0"
                                />
                                <span className="text-gray-200 text-xs leading-relaxed">
                                    I consent to AI-based proctoring. My camera, microphone and screen activity will be monitored for exam integrity.
                                </span>
                            </label>

                            <button
                                onClick={handleProceed}
                                disabled={!consentGiven}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${consentGiven
                                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                <Shield className="w-4 h-4" />
                                {consentGiven ? 'Start Proctored Test' : 'Give consent to continue'}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ProctoringSetup;
