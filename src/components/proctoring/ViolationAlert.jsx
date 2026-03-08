import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, ShieldAlert, Smartphone, Users, UserX, Eye, Volume2, BookOpen, Monitor } from 'lucide-react';

/**
 * ViolationAlert - Warning modal shown when a proctoring violation is detected
 *
 * @param {Object} props
 * @param {Object} props.violation - { type, severity, description, confidence }
 * @param {Object} props.result - { action, strikeCount, message } from processViolation
 * @param {function} props.onDismiss - Callback when user acknowledges
 * @param {boolean} props.isVisible - Whether to show the alert
 */
const ViolationAlert = ({ violation, result, onDismiss, isVisible }) => {
    const [timeLeft, setTimeLeft] = useState(10);

    // Auto-dismiss after 10 seconds
    useEffect(() => {
        if (!isVisible) return;
        setTimeLeft(10);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onDismiss?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible, violation]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!violation || !result) return null;

    const getViolationIcon = (type) => {
        switch (type) {
            case 'phone_detected': return <Smartphone className="w-8 h-8" />;
            case 'multiple_people': return <Users className="w-8 h-8" />;
            case 'no_face': return <UserX className="w-8 h-8" />;
            case 'looking_away': return <Eye className="w-8 h-8" />;
            case 'suspicious_audio': return <Volume2 className="w-8 h-8" />;
            case 'book_detected': return <BookOpen className="w-8 h-8" />;
            case 'tab_switch': return <Monitor className="w-8 h-8" />;
            default: return <AlertTriangle className="w-8 h-8" />;
        }
    };

    const getSeverityConfig = (severity, action) => {
        if (action === 'terminate') {
            return {
                borderColor: 'border-red-500',
                bgGradient: 'from-red-950/90 to-gray-900/95',
                iconColor: 'text-red-400',
                headerBg: 'bg-red-500/20',
                title: 'TEST TERMINATED',
                buttonBg: 'bg-red-600 hover:bg-red-700'
            };
        }
        if (action === 'alert' || severity === 'high') {
            return {
                borderColor: 'border-red-500',
                bgGradient: 'from-red-950/80 to-gray-900/95',
                iconColor: 'text-red-400',
                headerBg: 'bg-red-500/10',
                title: 'CRITICAL WARNING',
                buttonBg: 'bg-red-600 hover:bg-red-700'
            };
        }
        if (severity === 'medium') {
            return {
                borderColor: 'border-amber-500',
                bgGradient: 'from-amber-950/80 to-gray-900/95',
                iconColor: 'text-amber-400',
                headerBg: 'bg-amber-500/10',
                title: 'VIOLATION DETECTED',
                buttonBg: 'bg-amber-600 hover:bg-amber-700'
            };
        }
        return {
            borderColor: 'border-yellow-500',
            bgGradient: 'from-yellow-950/60 to-gray-900/95',
            iconColor: 'text-yellow-400',
            headerBg: 'bg-yellow-500/10',
            title: 'NOTICE',
            buttonBg: 'bg-yellow-600 hover:bg-yellow-700'
        };
    };

    const config = getSeverityConfig(violation.severity, result.action);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={`
                            w-full max-w-md bg-gradient-to-b ${config.bgGradient}
                            border-2 ${config.borderColor} rounded-2xl overflow-hidden shadow-2xl
                        `}
                    >
                        {/* Animated warning stripe */}
                        <div className={`h-1 ${config.borderColor.replace('border', 'bg')}`}>
                            <motion.div
                                className="h-full bg-white/30"
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 10, ease: 'linear' }}
                            />
                        </div>

                        {/* Header */}
                        <div className={`${config.headerBg} px-6 py-4`}>
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{
                                        rotate: result.action === 'terminate' ? [0, -10, 10, -10, 10, 0] : 0,
                                        scale: result.action === 'terminate' ? [1, 1.1, 1] : 1
                                    }}
                                    transition={{ duration: 0.5, repeat: result.action === 'terminate' ? 2 : 0 }}
                                    className={config.iconColor}
                                >
                                    {result.action === 'terminate' ? (
                                        <XCircle className="w-10 h-10" />
                                    ) : (
                                        <ShieldAlert className="w-10 h-10" />
                                    )}
                                </motion.div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">{config.title}</h2>
                                    <p className="text-gray-300 text-xs">
                                        Strike {result.strikeCount}/3
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-5 space-y-4">
                            {/* Violation icon and type */}
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${config.headerBg} ${config.iconColor}`}>
                                    {getViolationIcon(violation.type)}
                                </div>
                                <div>
                                    <p className="text-white font-semibold">{violation.description}</p>
                                    {violation.confidence > 0 && (
                                        <p className="text-gray-400 text-xs mt-1">
                                            Confidence: {Math.round(violation.confidence * 100)}%
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Warning message */}
                            <div className={`p-3 rounded-lg ${config.headerBg} border ${config.borderColor}`}>
                                <p className="text-gray-200 text-sm">{result.message}</p>
                            </div>

                            {/* Strike indicators */}
                            <div className="flex items-center justify-center gap-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={i === result.strikeCount - 1 ? { scale: 0 } : {}}
                                        animate={i === result.strikeCount - 1 ? { scale: [0, 1.3, 1] } : {}}
                                        transition={{ duration: 0.4 }}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${i < result.strikeCount
                                                ? 'bg-red-500 border-red-400'
                                                : 'bg-gray-700 border-gray-600'
                                            }`}
                                    >
                                        {i < result.strikeCount && (
                                            <XCircle className="w-4 h-4 text-white" />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Action button */}
                        {result.action !== 'terminate' && (
                            <div className="px-6 pb-5">
                                <button
                                    onClick={onDismiss}
                                    className={`
                                        w-full py-3 rounded-xl font-bold text-white transition-all
                                        ${config.buttonBg}
                                        flex items-center justify-center gap-2
                                    `}
                                >
                                    I Understand ({timeLeft}s)
                                </button>
                            </div>
                        )}

                        {result.action === 'terminate' && (
                            <div className="px-6 pb-5">
                                <div className="w-full py-3 rounded-xl bg-red-900/50 border border-red-500/30 text-center">
                                    <p className="text-red-300 font-semibold text-sm">
                                        Your test is being auto-submitted...
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ViolationAlert;
