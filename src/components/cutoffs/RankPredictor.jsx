import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, AlertCircle, CheckCircle, AlertTriangle, XCircle, ArrowRight, MapPin, Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../ui/Button';
import { getCollegesForRank, getNearbyColleges, getCategoryLabel, getPopularCategories, getCategoryGroups } from '../../lib/cutoffService';
import { buildShortlistKey } from '../../lib/preferencesService';

const RankPredictor = ({ filterOptions, shortlistKeys, onToggleShortlist, isAuthenticated }) => {
    const { isDark } = useTheme();
    const [rank, setRank] = useState('');
    const [category, setCategory] = useState('GOPENS');
    const [courseName, setCourseName] = useState('');
    const [city, setCity] = useState('');
    const [year, setYear] = useState(2025);
    const [capRound, setCapRound] = useState(1);
    const [results, setResults] = useState(null);
    const [nearbyResults, setNearbyResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [sortBy, setSortBy] = useState('rank'); // 'rank' | 'difference' | 'college'

    const categoryMap = getPopularCategories();
    const categoryGroups = getCategoryGroups();
    const allCategories = filterOptions?.categories || [];

    const groupedCategories = categoryGroups.map(group => {
        const items = allCategories.filter(code => categoryMap[code]?.group === group.group);
        return { ...group, items };
    }).filter(g => g.items.length > 0);

    const mappedCodes = new Set(Object.keys(categoryMap));
    const uncategorized = allCategories.filter(c => !mappedCodes.has(c));

    const handleSearch = useCallback(async () => {
        if (!rank || !category) return;

        setLoading(true);
        setSearched(true);
        setNearbyResults(null);

        try {
            const response = await getCollegesForRank(
                parseInt(rank),
                category,
                courseName || null,
                year,
                capRound,
                city || null
            );

            setResults(response);

            // If no results, search nearby
            if (!response.data || response.data.length === 0) {
                const nearby = await getNearbyColleges(
                    parseInt(rank),
                    category,
                    courseName || null,
                    year,
                    3000,
                    city || null,
                    capRound
                );
                setNearbyResults(nearby);
            }
        } catch (err) {
            console.error('Rank prediction error:', err);
            setResults({ data: [], count: 0, error: err });
        } finally {
            setLoading(false);
        }
    }, [rank, category, courseName, year, capRound, city]);

    // Sort results
    const sortedResults = results?.data ? [...results.data].sort((a, b) => {
        if (sortBy === 'rank') return (a.cutoff_rank || 0) - (b.cutoff_rank || 0);
        if (sortBy === 'difference') return (a.rankDifference || 0) - (b.rankDifference || 0);
        if (sortBy === 'college') return (a.college_name || '').localeCompare(b.college_name || '');
        return 0;
    }) : [];

    // Count by safety
    const safeCount = sortedResults.filter(r => r.safety === 'safe').length;
    const moderateCount = sortedResults.filter(r => r.safety === 'moderate').length;
    const reachCount = sortedResults.filter(r => r.safety === 'reach').length;

    // Unique branches count
    const uniqueBranches = new Set(sortedResults.map(r => r.course_name)).size;

    const selectClass = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 transition-colors appearance-none ${
        isDark
            ? 'bg-dark-bg border-white/10 text-white'
            : 'bg-white border-gray-200 text-gray-900'
    }`;

    const labelClass = `text-xs font-medium mb-1.5 block font-general ${
        isDark ? 'text-white/50' : 'text-gray-500'
    }`;

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-5 md:p-6 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                }`}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
                        <TrendingUp size={20} className="text-brand" />
                    </div>
                    <div>
                        <h3 className={`font-semibold font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Find Your Colleges
                        </h3>
                        <p className={`text-xs font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            Enter your rank to see eligible colleges
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Rank Input */}
                    <div>
                        <label className={labelClass}>Your MHT-CET Rank *</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="e.g., 5000"
                            value={rank}
                            onChange={(e) => setRank(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className={`${selectClass} font-semibold`}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelClass}>Category *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={selectClass}
                        >
                            {groupedCategories.map(group => (
                                <optgroup key={group.group} label={group.label}>
                                    {group.items.map(code => (
                                        <option key={code} value={code}>
                                            {getCategoryLabel(code)}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                            {uncategorized.length > 0 && (
                                <optgroup label="Other Categories">
                                    {uncategorized.map(code => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Branch (Optional) */}
                    <div>
                        <label className={labelClass}>Preferred Branch (optional)</label>
                        <select
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">All Branches</option>
                            {(filterOptions?.courses || []).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* City/District */}
                    <div>
                        <label className={labelClass}>City / District</label>
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">All Cities</option>
                            {(filterOptions?.cities || []).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year */}
                    <div>
                        <label className={labelClass}>Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className={selectClass}
                        >
                            {(filterOptions?.years || [2025, 2024, 2023]).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* CAP Round */}
                    <div>
                        <label className={labelClass}>CAP Round</label>
                        <select
                            value={capRound}
                            onChange={(e) => setCapRound(parseInt(e.target.value))}
                            className={selectClass}
                        >
                            {(filterOptions?.capRounds || [1, 2, 3, 4]).map(r => (
                                <option key={r} value={r}>Round {r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                    <Button
                        onClick={handleSearch}
                        disabled={!rank || !category || loading}
                        className="!rounded-xl"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search size={18} />
                                Find My Colleges
                            </>
                        )}
                    </Button>
                    <p className={`text-xs font-general ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        Based on CAP Round {capRound} data
                    </p>
                </div>
            </motion.div>

            {/* Results */}
            <AnimatePresence mode="wait">
                {searched && !loading && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Summary Stats */}
                        {sortedResults.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard
                                    label="Total Matches"
                                    value={sortedResults.length}
                                    icon="🎯"
                                    isDark={isDark}
                                />
                                <StatCard
                                    label="Safe Options"
                                    value={safeCount}
                                    icon="🟢"
                                    color="text-emerald-400"
                                    isDark={isDark}
                                />
                                <StatCard
                                    label="Moderate"
                                    value={moderateCount}
                                    icon="🟡"
                                    color="text-yellow-400"
                                    isDark={isDark}
                                />
                                <StatCard
                                    label="Branches"
                                    value={uniqueBranches}
                                    icon="📚"
                                    isDark={isDark}
                                />
                            </div>
                        )}

                        {/* Sort Controls */}
                        {sortedResults.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Sort by:</span>
                                {[
                                    { key: 'rank', label: 'Cutoff Rank' },
                                    { key: 'difference', label: 'Best Match' },
                                    { key: 'college', label: 'College Name' },
                                ].map(option => (
                                    <button
                                        key={option.key}
                                        onClick={() => setSortBy(option.key)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            sortBy === option.key
                                                ? 'bg-brand text-white'
                                                : isDark
                                                    ? 'bg-white/5 text-white/60 hover:bg-white/10'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Result Cards */}
                        {sortedResults.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sortedResults.map((record, i) => (
                                    <PredictorCard key={record.id || i} record={record} userRank={parseInt(rank)} isDark={isDark} index={i} shortlistKeys={shortlistKeys} onToggleShortlist={onToggleShortlist} isAuthenticated={isAuthenticated} />
                                ))}
                            </div>
                        ) : (
                            /* No Results */
                            <div className={`rounded-2xl border p-8 text-center ${
                                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
                            }`}>
                                <AlertCircle size={40} className="text-yellow-400 mx-auto mb-3" />
                                <h3 className={`font-semibold font-general mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    No Direct Matches Found
                                </h3>
                                <p className={`text-sm font-general mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                    No colleges found with cutoff rank ≥ {parseInt(rank).toLocaleString()} for {getCategoryLabel(category)}.
                                </p>

                                {/* Nearby colleges */}
                                {nearbyResults?.data && nearbyResults.data.length > 0 && (
                                    <div className="mt-6 text-left">
                                        <h4 className={`text-sm font-semibold font-general mb-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                            Colleges within 3,000 ranks:
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {nearbyResults.data.slice(0, 10).map((record, i) => (
                                                <NearbyCard key={i} record={record} userRank={parseInt(rank)} isDark={isDark} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Initial State */}
            {!searched && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-2xl border p-8 text-center ${
                        isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'
                    }`}
                >
                    <div className="text-5xl mb-4">🎓</div>
                    <h3 className={`font-semibold font-general text-lg mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                        Predict Your College Admissions
                    </h3>
                    <p className={`text-sm font-general max-w-md mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        Enter your MHT-CET rank and category above to discover which engineering colleges and branches you're eligible for, based on real cutoff data.
                    </p>
                </motion.div>
            )}
        </div>
    );
};

// Stat card component
const StatCard = ({ label, value, icon, color, isDark }) => (
    <div className={`rounded-xl border p-3 text-center ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
    }`}>
        <div className="text-xl mb-1">{icon}</div>
        <div className={`text-2xl font-bold font-general ${color || (isDark ? 'text-white' : 'text-gray-900')}`}>
            {value}
        </div>
        <div className={`text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{label}</div>
    </div>
);

// Individual prediction result card
const PredictorCard = ({ record, userRank, isDark, index, shortlistKeys, onToggleShortlist, isAuthenticated }) => {
    const isShortlisted = shortlistKeys && shortlistKeys.has(buildShortlistKey(record));
    const safetyConfig = {
        safe: {
            icon: <CheckCircle size={18} />,
            label: 'SAFE',
            bg: isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200',
            badge: 'bg-emerald-500/20 text-emerald-400',
            text: isDark ? 'text-emerald-400' : 'text-emerald-600',
        },
        moderate: {
            icon: <AlertTriangle size={18} />,
            label: 'MODERATE',
            bg: isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200',
            badge: 'bg-yellow-500/20 text-yellow-400',
            text: isDark ? 'text-yellow-400' : 'text-yellow-600',
        },
        reach: {
            icon: <XCircle size={18} />,
            label: 'REACH',
            bg: isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200',
            badge: 'bg-red-500/20 text-red-400',
            text: isDark ? 'text-red-400' : 'text-red-600',
        },
    };

    const config = safetyConfig[record.safety] || safetyConfig.reach;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-lg ${config.bg}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold font-general text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {record.college_name}
                    </h4>
                    <p className={`text-xs font-general mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {record.course_name}
                    </p>
                    {record.city && (
                        <p className={`text-xs font-general mt-0.5 flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            <MapPin size={10} />
                            {record.city}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleShortlist?.(record);
                        }}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${
                            isShortlisted
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : isAuthenticated
                                    ? isDark
                                        ? 'text-white/20 hover:text-yellow-400/70 hover:bg-white/5'
                                        : 'text-gray-300 hover:text-yellow-400/70'
                                    : isDark
                                        ? 'text-white/10'
                                        : 'text-gray-200'
                        }`}
                        title={isAuthenticated ? (isShortlisted ? 'Remove from shortlist' : 'Add to shortlist') : 'Sign in to shortlist'}
                    >
                        <Star size={16} fill={isShortlisted ? 'currentColor' : 'none'} />
                    </button>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${config.badge}`}>
                        {config.icon}
                        {config.label}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                    <span className={`text-xs block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Cutoff Rank</span>
                    <span className={`text-sm font-bold font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {record.cutoff_rank?.toLocaleString() || '—'}
                    </span>
                </div>
                <div>
                    <span className={`text-xs block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Your Rank</span>
                    <span className={`text-sm font-bold font-general text-brand`}>
                        {userRank.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Difference */}
            <div className={`mt-3 pt-3 border-t flex items-center justify-between ${
                isDark ? 'border-white/10' : 'border-gray-200/50'
            }`}>
                <span className={`text-xs font-general ${config.text}`}>
                    {record.rankDifference > 0 
                        ? `✅ You're ${record.rankDifference.toLocaleString()} ranks above cutoff`
                        : `⚠️ You're ${Math.abs(record.rankDifference).toLocaleString()} ranks below cutoff`
                    }
                </span>
                <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    R{record.cap_round}
                </span>
            </div>
        </motion.div>
    );
};

// Nearby college card (when no exact matches)
const NearbyCard = ({ record, userRank, isDark }) => {
    const diff = record.cutoff_rank - userRank;

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
        }`}>
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium font-general truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {record.college_name}
                </p>
                <p className={`text-xs font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {record.course_name} • Cutoff: {record.cutoff_rank?.toLocaleString()}{record.city ? ` • ${record.city}` : ''}
                </p>
            </div>
            <div className={`text-xs font-semibold whitespace-nowrap ml-3 ${
                diff >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
                {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
            </div>
        </div>
    );
};

export default RankPredictor;
