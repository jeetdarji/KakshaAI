import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Camera, Mic, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { getProctoringStatus } from '../../lib/proctoring/proctoringService';

/**
 * ProctoringIndicator - Live status indicator shown during the test
 * Small floating badge that shows proctoring status (monitoring, warnings, strikes)
 *
 * @param {Object} props
 * @param {string} props.status - 'monitoring' | 'paused' | 'warning' | 'error'
 * @param {number} props.strikes - Current strike count
 * @param {number} props.maxStrikes - Maximum strikes before termination
 * @param {Object} props.capabilities - { objectDetection, faceDetection, audioMonitoring }
 */
const ProctoringIndicator = ({ status = 'monitoring', strikes = 0, maxStrikes = 3, capabilities = {} }) => {
    const [expanded, setExpanded] = useState(false);
    const [pulse, setPulse] = useState(false);

    // Pulse animation on strike change
    useEffect(() => {
        if (strikes > 0) {
            setPulse(true);
            const timer = setTimeout(() => setPulse(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [strikes]);

    const getStatusConfig = () => {
        switch (status) {
            case 'monitoring':
                return {
                    color: 'bg-emerald-500',
                    borderColor: 'border-emerald-500/30',
                    bgColor: 'bg-emerald-500/10',
                    icon: <Eye className="w-3.5 h-3.5" />,
                    label: 'AI Proctoring Active',
                    dotClass: 'bg-emerald-400'
                };
            case 'warning':
                return {
                    color: 'bg-amber-500',
                    borderColor: 'border-amber-500/30',
                    bgColor: 'bg-amber-500/10',
                    icon: <AlertTriangle className="w-3.5 h-3.5" />,
                    label: 'Warning Issued',
                    dotClass: 'bg-amber-400'
                };
            case 'paused':
                return {
                    color: 'bg-gray-500',
                    borderColor: 'border-gray-500/30',
                    bgColor: 'bg-gray-500/10',
                    icon: <WifiOff className="w-3.5 h-3.5" />,
                    label: 'Proctoring Paused',
                    dotClass: 'bg-gray-400'
                };
            case 'error':
                return {
                    color: 'bg-red-500',
                    borderColor: 'border-red-500/30',
                    bgColor: 'bg-red-500/10',
                    icon: <AlertTriangle className="w-3.5 h-3.5" />,
                    label: 'Proctoring Error',
                    dotClass: 'bg-red-400'
                };
            default:
                return {
                    color: 'bg-teal-500',
                    borderColor: 'border-teal-500/30',
                    bgColor: 'bg-teal-500/10',
                    icon: <Shield className="w-3.5 h-3.5" />,
                    label: 'Proctoring',
                    dotClass: 'bg-teal-400'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className="relative">
            {/* Compact badge */}
            <motion.div
                layout
                onClick={() => setExpanded(!expanded)}
                className={`
                    cursor-pointer select-none
                    flex items-center gap-2 px-3 py-1.5 rounded-full
                    border ${config.borderColor} ${config.bgColor}
                    text-white text-xs font-medium
                    transition-all hover:scale-105 active:scale-95
                    ${pulse ? 'ring-2 ring-red-400 ring-opacity-60' : ''}
                `}
                whileTap={{ scale: 0.95 }}
            >
                {/* Live dot */}
                <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
                </span>

                {config.icon}

                {/* Strike counter */}
                {strikes > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${strikes >= maxStrikes - 1
                                ? 'bg-red-500 text-white'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                    >
                        {strikes}/{maxStrikes}
                    </motion.span>
                )}
            </motion.div>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className={`px-4 py-2.5 ${config.bgColor} border-b border-gray-700`}>
                            <div className="flex items-center gap-2 text-white">
                                <Shield className="w-4 h-4 text-teal-400" />
                                <span className="font-semibold text-sm">{config.label}</span>
                            </div>
                        </div>

                        <div className="p-3 space-y-2">
                            {/* Active monitors */}
                            <div className="space-y-1.5">
                                <MonitorItem
                                    icon={<Camera className="w-3.5 h-3.5" />}
                                    label="Object Detection"
                                    active={capabilities.objectDetection}
                                />
                                <MonitorItem
                                    icon={<Eye className="w-3.5 h-3.5" />}
                                    label="Face & Eye Tracking"
                                    active={capabilities.faceDetection}
                                />
                                <MonitorItem
                                    icon={<Mic className="w-3.5 h-3.5" />}
                                    label="Audio Monitoring"
                                    active={capabilities.audioMonitoring}
                                />
                            </div>

                            {/* Strikes */}
                            <div className="pt-2 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-xs">Warnings</span>
                                    <div className="flex gap-1">
                                        {Array.from({ length: maxStrikes }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-4 h-4 rounded-full border ${i < strikes
                                                        ? 'bg-red-500 border-red-400'
                                                        : 'bg-gray-700 border-gray-600'
                                                    } transition-colors`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {strikes >= maxStrikes - 1 && strikes > 0 && (
                                    <p className="text-red-400 text-[10px] mt-1">
                                        One more violation will auto-submit your test!
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MonitorItem = ({ icon, label, active }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
            {icon}
            <span className="text-xs">{label}</span>
        </div>
        {active ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
            <span className="text-[10px] text-gray-500">OFF</span>
        )}
    </div>
);

export default ProctoringIndicator;
