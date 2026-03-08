import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRightLeft, X, TrendingUp, TrendingDown, Minus,
    Save, Trash2, ChevronDown, AlertCircle, MapPin
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getCategoryShort, getCutoffTrends, getTrendInsight } from '../../lib/cutoffService';
import { saveComparison, getComparisons, deleteComparison, requireAuth } from '../../lib/preferencesService';

const ComparisonView = ({ colleges = [], onClose, onRemoveCollege }) => {
    const { isDark } = useTheme();
    const [trendData, setTrendData] = useState({});
    const [loadingTrends, setLoadingTrends] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedComparisons, setSavedComparisons] = useState([]);
    const [showSaved, setShowSaved] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);

    // Check auth
    useEffect(() => {
        requireAuth().then(({ userId }) => setIsAuthenticated(!!userId));
    }, []);

    // Fetch trend data for each college
    useEffect(() => {
        if (colleges.length === 0) return;

        const fetchTrends = async () => {
            setLoadingTrends(true);
            const trends = {};

            await Promise.all(
                colleges.map(async (college) => {
                    const key = `${college.college_name}||${college.course_name}`;
                    const { data } = await getCutoffTrends(
                        college.college_name,
                        college.course_name,
                        college.category || 'GOPENS'
                    );
                    if (data) {
                        trends[key] = data;
                    }
                })
            );

            setTrendData(trends);
            setLoadingTrends(false);
        };

        fetchTrends();
    }, [colleges]);

    // Load saved comparisons
    useEffect(() => {
        if (isAuthenticated) {
            getComparisons().then(({ data }) => setSavedComparisons(data || []));
        }
    }, [isAuthenticated]);

    const handleSave = async () => {
        if (!saveName.trim()) return;
        setSaving(true);
        const { error } = await saveComparison(saveName.trim(), colleges);
        if (error) {
            setSaveMessage({ type: 'error', text: error });
        } else {
            setSaveMessage({ type: 'success', text: 'Comparison saved!' });
            setShowSaveInput(false);
            setSaveName('');
            // Refresh saved list
            const { data } = await getComparisons();
            setSavedComparisons(data || []);
        }
        setSaving(false);
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const handleDeleteSaved = async (id) => {
        await deleteComparison(id);
        setSavedComparisons(prev => prev.filter(c => c.id !== id));
    };

    const getTrend = (college) => {
        const key = `${college.college_name}||${college.course_name}`;
        const data = trendData[key];
        if (!data) return null;
        return getTrendInsight(data);
    };

    const TrendIcon = ({ trend }) => {
        if (!trend) return <Minus size={14} className={isDark ? 'text-white/30' : 'text-gray-400'} />;
        if (trend.trend === 'harder') return <TrendingDown size={14} className="text-red-400" />;
        if (trend.trend === 'easier') return <TrendingUp size={14} className="text-emerald-400" />;
        return <Minus size={14} className="text-yellow-400" />;
    };

    if (colleges.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-8 text-center ${
                    isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'
                }`}
            >
                <div className="text-5xl mb-4">⚖️</div>
                <h3 className={`font-semibold font-general text-lg mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    No Colleges to Compare
                </h3>
                <p className={`text-sm font-general max-w-sm mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Select 2-4 colleges from your shortlist to compare them side-by-side.
                </p>
            </motion.div>
        );
    }

    // Find best values for highlighting
    const bestRank = Math.min(...colleges.map(c => c.cutoff_rank || Infinity));
    const bestPercentile = Math.max(...colleges.map(c => c.cutoff_percentile || 0));

    // Comparison attributes
    const rows = [
        {
            label: 'Branch',
            getValue: (c) => c.course_name || '—',
            type: 'text',
        },
        {
            label: 'Cutoff Rank',
            getValue: (c) => c.cutoff_rank,
            format: (v) => v ? v.toLocaleString() : '—',
            isBest: (v) => v === bestRank,
            type: 'rank',
        },
        {
            label: 'Percentile',
            getValue: (c) => c.cutoff_percentile,
            format: (v) => v ? `${Number(v).toFixed(2)}%` : '—',
            isBest: (v) => v === bestPercentile,
            type: 'percentile',
        },
        {
            label: 'Category',
            getValue: (c) => getCategoryShort(c.category),
            type: 'text',
        },
        {
            label: 'Year / Round',
            getValue: (c) => `${c.year || '—'} R${c.cap_round || '—'}`,
            type: 'text',
        },
        {
            label: 'City',
            getValue: (c) => c.city || '—',
            type: 'text',
        },
        {
            label: 'Level',
            getValue: (c) => c.level || '—',
            type: 'text',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <ArrowRightLeft size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className={`font-semibold font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Compare Colleges
                        </h3>
                        <p className={`text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            {colleges.length} college{colleges.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isAuthenticated && (
                        <button
                            onClick={() => setShowSaveInput(!showSaveInput)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                                isDark
                                    ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <Save size={14} />
                            Save
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${
                                isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-400'
                            }`}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Save input */}
            <AnimatePresence>
                {showSaveInput && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                        }`}>
                            <input
                                autoFocus
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                placeholder="Name this comparison..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                className={`flex-1 text-sm rounded-lg border px-3 py-2 font-general focus:outline-none focus:border-brand/50 ${
                                    isDark
                                        ? 'bg-dark-bg border-white/10 text-white placeholder-white/30'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                }`}
                            />
                            <button
                                onClick={handleSave}
                                disabled={!saveName.trim() || saving}
                                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Save message */}
            <AnimatePresence>
                {saveMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={`p-2.5 rounded-lg text-xs font-medium ${
                            saveMessage.type === 'success'
                                ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                        }`}
                    >
                        {saveMessage.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comparison Table */}
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        {/* College Headers */}
                        <thead>
                            <tr className={`border-b ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <th className={`p-4 text-left text-xs font-medium font-general w-32 ${
                                    isDark ? 'text-white/40' : 'text-gray-400'
                                }`}>
                                    Attribute
                                </th>
                                {colleges.map((college, i) => (
                                    <th key={i} className="p-4 text-left min-w-[180px]">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-semibold font-general text-sm truncate ${
                                                    isDark ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                    {college.college_name}
                                                </h4>
                                                {college.city && (
                                                    <p className={`text-xs font-general mt-0.5 flex items-center gap-1 ${
                                                        isDark ? 'text-white/40' : 'text-gray-400'
                                                    }`}>
                                                        <MapPin size={10} />
                                                        {college.city}
                                                    </p>
                                                )}
                                            </div>
                                            {onRemoveCollege && (
                                                <button
                                                    onClick={() => onRemoveCollege(i)}
                                                    className={`ml-2 p-1 rounded transition-colors flex-shrink-0 ${
                                                        isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-200 text-gray-400'
                                                    }`}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr
                                    key={ri}
                                    className={`border-b transition-colors ${
                                        isDark ? 'border-white/5 hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50/50'
                                    }`}
                                >
                                    <td className={`p-4 text-xs font-medium font-general ${
                                        isDark ? 'text-white/40' : 'text-gray-500'
                                    }`}>
                                        {row.label}
                                    </td>
                                    {colleges.map((college, ci) => {
                                        const value = row.getValue(college);
                                        const displayValue = row.format ? row.format(value) : value;
                                        const best = row.isBest?.(value);

                                        return (
                                            <td key={ci} className="p-4">
                                                <span className={`text-sm font-general ${
                                                    best
                                                        ? 'text-brand font-bold'
                                                        : row.type === 'rank'
                                                            ? isDark ? 'text-white/80 font-semibold' : 'text-gray-800 font-semibold'
                                                            : isDark ? 'text-white/70' : 'text-gray-600'
                                                }`}>
                                                    {displayValue}
                                                    {best && ' ✨'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Trend Row */}
                            <tr className={isDark ? 'border-white/5' : 'border-gray-100'}>
                                <td className={`p-4 text-xs font-medium font-general ${
                                    isDark ? 'text-white/40' : 'text-gray-500'
                                }`}>
                                    Trend
                                </td>
                                {colleges.map((college, ci) => {
                                    const trend = getTrend(college);
                                    return (
                                        <td key={ci} className="p-4">
                                            {loadingTrends ? (
                                                <div className={`h-4 w-20 rounded animate-pulse ${
                                                    isDark ? 'bg-white/10' : 'bg-gray-200'
                                                }`} />
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <TrendIcon trend={trend} />
                                                    <span className={`text-xs font-general ${
                                                        isDark ? 'text-white/50' : 'text-gray-500'
                                                    }`}>
                                                        {trend ? trend.text : 'No trend data'}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile-friendly card layout */}
            <div className="md:hidden space-y-3">
                {colleges.map((college, i) => {
                    const trend = getTrend(college);
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`rounded-xl border p-4 ${
                                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h4 className={`font-semibold font-general text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {college.college_name}
                                </h4>
                                {onRemoveCollege && (
                                    <button
                                        onClick={() => onRemoveCollege(i)}
                                        className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-100 text-gray-400'}`}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {rows.map((row, ri) => {
                                    const value = row.getValue(college);
                                    const displayValue = row.format ? row.format(value) : value;
                                    return (
                                        <div key={ri}>
                                            <span className={`text-xs block ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                {row.label}
                                            </span>
                                            <span className={`text-sm font-general ${
                                                isDark ? 'text-white/70' : 'text-gray-700'
                                            }`}>
                                                {displayValue}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div>
                                    <span className={`text-xs block ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Trend</span>
                                    <div className="flex items-center gap-1">
                                        <TrendIcon trend={trend} />
                                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                            {trend ? trend.trend : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Saved Comparisons */}
            {isAuthenticated && savedComparisons.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowSaved(!showSaved)}
                        className={`flex items-center gap-2 text-xs font-medium font-general transition-colors ${
                            isDark ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <ChevronDown size={14} className={`transition-transform ${showSaved ? 'rotate-180' : ''}`} />
                        Saved Comparisons ({savedComparisons.length})
                    </button>

                    <AnimatePresence>
                        {showSaved && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-2 space-y-2"
                            >
                                {savedComparisons.map((comp) => (
                                    <div
                                        key={comp.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${
                                            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <span className={`text-sm font-medium font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {comp.data?.name || 'Untitled'}
                                            </span>
                                            <span className={`text-xs ml-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                {comp.data?.colleges?.length || 0} colleges
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSaved(comp.id)}
                                            className={`p-1.5 rounded transition-colors ${
                                                isDark ? 'hover:bg-red-500/10 text-red-400/50' : 'hover:bg-red-50 text-red-400'
                                            }`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};

export default ComparisonView;
