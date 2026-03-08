import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Clock, Smartphone, Users, UserX, Eye, Volume2, BookOpen, Monitor, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { getSessionViolations, getViolationTypeLabel, getSeverityColor } from '../../lib/proctoring/violationHandler';

/**
 * ProctoringReport - Shows proctoring summary after test completion
 *
 * @param {Object} props
 * @param {string} props.sessionId - Proctoring session ID
 * @param {number} props.totalViolations - Total violation count
 * @param {string} props.status - 'completed' | 'terminated'
 * @param {boolean} props.isDark - Theme mode
 */
const ProctoringReport = ({ sessionId, totalViolations = 0, status = 'completed', isDark }) => {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (sessionId) {
            loadViolations();
        } else {
            setLoading(false);
        }
    }, [sessionId]);

    const loadViolations = async () => {
        const data = await getSessionViolations(sessionId);
        setViolations(data);
        setLoading(false);
    };

    const getViolationIcon = (type) => {
        const iconMap = {
            'phone_detected': Smartphone,
            'multiple_people': Users,
            'no_face': UserX,
            'looking_away': Eye,
            'suspicious_audio': Volume2,
            'book_detected': BookOpen,
            'tab_switch': Monitor
        };
        const Icon = iconMap[type] || AlertTriangle;
        return <Icon className="w-4 h-4" />;
    };

    // Use whichever is higher: DB total_violations or actual fetched count
    const actualViolationCount = Math.max(totalViolations, violations.length);

    const getIntegrityScore = () => {
        if (actualViolationCount === 0) return { score: 100, label: 'Excellent', color: 'text-emerald-400' };
        if (actualViolationCount <= 2) return { score: 80, label: 'Good', color: 'text-teal-400' };
        if (actualViolationCount <= 4) return { score: 60, label: 'Fair', color: 'text-amber-400' };
        return { score: Math.max(20, 100 - actualViolationCount * 15), label: 'Poor', color: 'text-red-400' };
    };

    const integrity = getIntegrityScore();

    if (loading) {
        return (
            <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-700" />
                    <div className="flex-1">
                        <div className="h-4 bg-gray-700 rounded w-48 mb-2" />
                        <div className="h-3 bg-gray-700 rounded w-32" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border overflow-hidden ${isDark
                    ? 'bg-gray-900/50 border-gray-700'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
        >
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                className={`
                    px-5 py-4 flex items-center justify-between cursor-pointer transition-colors
                    ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${status === 'terminated'
                            ? 'bg-red-500/10 text-red-400'
                            : actualViolationCount === 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                        }`}>
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            AI Proctoring Report
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {actualViolationCount === 0
                                ? 'No violations detected'
                                : `${actualViolationCount} violation${actualViolationCount > 1 ? 's' : ''} recorded`
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Integrity Score */}
                    <div className="text-right">
                        <p className={`text-lg font-bold ${integrity.color}`}>{integrity.score}%</p>
                        <p className="text-[10px] text-gray-500">Integrity</p>
                    </div>
                    {expanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className={`border-t px-5 py-4 space-y-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            {/* Status indicator */}
                            {status === 'terminated' && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <span className="text-red-300 text-sm">
                                        Test was auto-submitted due to maximum violations
                                    </span>
                                </div>
                            )}

                            {actualViolationCount === 0 ? (
                                <div className="flex items-center gap-3 py-4 justify-center">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                    <div className="text-center">
                                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Clean Session
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            No suspicious activity detected during this test
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {violations.map((v, index) => (
                                        <motion.div
                                            key={v.id || index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`
                                                flex items-start gap-3 p-3 rounded-lg
                                                ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}
                                            `}
                                        >
                                            <div className={`mt-0.5 ${getSeverityColor(v.severity)}`}>
                                                {getViolationIcon(v.violation_type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {getViolationTypeLabel(v.violation_type)}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.severity === 'high'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : v.severity === 'medium'
                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                : 'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {v.severity}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                    {v.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock className="w-3 h-3 text-gray-500" />
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(v.created_at).toLocaleTimeString()}
                                                    </span>
                                                    {v.confidence_score > 0 && (
                                                        <span className="text-[10px] text-gray-500">
                                                            • {Math.round(v.confidence_score * 100)}% confidence
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {v.screenshot_url && (
                                                <a
                                                    href={v.screenshot_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-shrink-0"
                                                >
                                                    <Camera className="w-4 h-4 text-teal-400 hover:text-teal-300" />
                                                </a>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ProctoringReport;
