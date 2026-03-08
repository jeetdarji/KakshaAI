import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Minimize2, Maximize2 } from 'lucide-react';

/**
 * CameraPreview - Small draggable camera preview shown during the test
 *
 * @param {Object} props
 * @param {MediaStream} props.stream - Camera video stream
 * @param {React.Ref} props.videoRef - Ref to be passed for the internal video element (used by proctoring)
 * @param {boolean} props.isActive - Whether proctoring is active
 */
const CameraPreview = ({ stream, videoRef: externalVideoRef, isActive = true }) => {
    const internalVideoRef = useRef(null);
    const [minimized, setMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Use external ref or internal
    const videoElement = externalVideoRef || internalVideoRef;

    // Attach stream to video element
    useEffect(() => {
        const video = videoElement.current;
        if (video && stream) {
            video.srcObject = stream;
            video.play().catch(() => { });
        }

        return () => {
            if (video) {
                video.srcObject = null;
            }
        };
    }, [stream, videoElement]);

    // Re-attach stream when un-minimized
    useEffect(() => {
        if (!minimized && videoElement.current && stream) {
            videoElement.current.srcObject = stream;
            videoElement.current.play().catch(() => { });
        }
    }, [minimized, stream, videoElement]);

    if (!isActive || !stream) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
                fixed bottom-4 right-4 z-[60]
                rounded-xl overflow-hidden shadow-2xl
                border-2 border-gray-600/50
                bg-black cursor-move
                ${minimized ? 'w-12 h-12' : 'w-52 h-40'}
                transition-all duration-300
            `}
            style={{ touchAction: 'none' }}
        >
            {minimized ? (
                <button
                    onClick={() => setMinimized(false)}
                    className="w-full h-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <Camera className="w-5 h-5 text-teal-400" />
                </button>
            ) : (
                <>
                    <video
                        ref={videoElement}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                    />

                    {/* Controls overlay */}
                    <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-1.5 py-1 bg-gradient-to-b from-black/60 to-transparent">
                        <div className="flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                            </span>
                            <span className="text-[9px] text-white/80 font-medium">REC</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMinimized(true);
                            }}
                            className="p-0.5 hover:bg-white/20 rounded transition-colors"
                        >
                            <Minimize2 className="w-3 h-3 text-white/80" />
                        </button>
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default CameraPreview;
