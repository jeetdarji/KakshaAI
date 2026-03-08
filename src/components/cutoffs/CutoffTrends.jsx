import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Search, BarChart3, ArrowRight, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../ui/Button';
import { getCutoffTrends, getTrendInsight, getCategoryLabel } from '../../lib/cutoffService';

const ROUND_COLORS = {
    1: '#14b8a6', // teal-500 (brand)
    2: '#f59e0b', // amber-500
    3: '#8b5cf6', // violet-500
    4: '#ef4444', // red-500
};

const CutoffTrends = ({ filterOptions }) => {
    const { isDark } = useTheme();
    const [collegeName, setCollegeName] = useState('');
    const [courseName, setCourseName] = useState('');
    const [category, setCategory] = useState('GOPENS');
    const [trendData, setTrendData] = useState(null);
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [chartType, setChartType] = useState('rank'); // 'rank' | 'percentile'
    const [collegeSuggestions, setCollegeSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Autocomplete college name
    useEffect(() => {
        if (collegeName.length >= 2 && filterOptions?.colleges) {
            const matches = filterOptions.colleges
                .filter(c => c.toLowerCase().includes(collegeName.toLowerCase()))
                .slice(0, 8);
            setCollegeSuggestions(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setCollegeSuggestions([]);
            setShowSuggestions(false);
        }
    }, [collegeName, filterOptions]);

    const handleSearch = useCallback(async () => {
        if (!collegeName || !courseName) return;

        setLoading(true);
        setSearched(true);
        setFetchError(null);

        try {
            const response = await getCutoffTrends(collegeName, courseName, category);
            if (response.error) {
                setFetchError(response.error.message || 'Failed to fetch trend data. Please try again.');
                setTrendData([]);
                setInsight(null);
                return;
            }
            setTrendData(response.data || []);
            const insightResult = getTrendInsight(response.data || []);
            setInsight(insightResult);
        } catch (err) {
            console.error('Trends fetch error:', err);
            setFetchError(err.message || 'An unexpected error occurred');
            setTrendData([]);
            setInsight(null);
        } finally {
            setLoading(false);
        }
    }, [collegeName, courseName, category]);

    // Transform data for chart: group by year, create separate keys for each CAP round
    const chartData = React.useMemo(() => {
        if (!trendData || trendData.length === 0) return [];

        const byYear = {};
        trendData.forEach(row => {
            if (!byYear[row.year]) {
                byYear[row.year] = { year: row.year };
            }
            byYear[row.year][`round${row.cap_round}_rank`] = row.cutoff_rank;
            byYear[row.year][`round${row.cap_round}_percentile`] = row.cutoff_percentile;
        });

        return Object.values(byYear).sort((a, b) => a.year - b.year);
    }, [trendData]);

    // Get available rounds from data
    const availableRounds = React.useMemo(() => {
        if (!trendData || trendData.length === 0) return [];
        const rounds = [...new Set(trendData.map(d => d.cap_round))].sort();
        return rounds;
    }, [trendData]);

    // Get max/min values for info
    const dataStats = React.useMemo(() => {
        if (!trendData || trendData.length === 0) return null;
        const ranks = trendData.filter(d => d.cutoff_rank).map(d => d.cutoff_rank);
        if (ranks.length === 0) return null;
        return {
            minRank: Math.min(...ranks),
            maxRank: Math.max(...ranks),
            avgRank: Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length),
            dataPoints: trendData.length,
        };
    }, [trendData]);

    const selectClass = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 transition-colors ${
        isDark
            ? 'bg-dark-bg border-white/10 text-white'
            : 'bg-white border-gray-200 text-gray-900'
    }`;

    const labelClass = `text-xs font-medium mb-1.5 block font-general ${
        isDark ? 'text-white/50' : 'text-gray-500'
    }`;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload) return null;
        return (
            <div className={`rounded-lg border px-4 py-3 shadow-xl ${
                isDark ? 'bg-dark-bg border-white/10' : 'bg-white border-gray-200'
            }`}>
                <p className={`text-sm font-semibold mb-2 font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Year {label}
                </p>
                {payload.map((entry, i) => {
                    const roundNum = entry.dataKey.match(/round(\d)/)?.[1];
                    return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className={isDark ? 'text-white/60' : 'text-gray-500'}>
                                CAP Round {roundNum}:
                            </span>
                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {chartType === 'rank'
                                    ? entry.value?.toLocaleString()
                                    : `${entry.value}%`
                                }
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

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
                        <BarChart3 size={20} className="text-brand" />
                    </div>
                    <div>
                        <h3 className={`font-semibold font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Cutoff Trends
                        </h3>
                        <p className={`text-xs font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            Visualize how cutoffs change year-over-year
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* College Name */}
                    <div className="relative">
                        <label className={labelClass}>College Name *</label>
                        <input
                            type="text"
                            placeholder="Type college name..."
                            value={collegeName}
                            onChange={(e) => setCollegeName(e.target.value)}
                            onFocus={() => collegeSuggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className={selectClass}
                        />

                        {/* Autocomplete dropdown */}
                        <AnimatePresence>
                            {showSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className={`absolute z-30 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                                        isDark ? 'bg-dark-bg border-white/10' : 'bg-white border-gray-200'
                                    }`}
                                >
                                    {collegeSuggestions.map((name, i) => (
                                        <button
                                            key={i}
                                            onMouseDown={() => {
                                                setCollegeName(name);
                                                setShowSuggestions(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm font-general transition-colors ${
                                                isDark
                                                    ? 'text-white/80 hover:bg-white/10'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Branch */}
                    <div>
                        <label className={labelClass}>Branch *</label>
                        <select
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Select branch...</option>
                            {(filterOptions?.courses || []).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelClass}>Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={selectClass}
                        >
                            {(filterOptions?.categories || ['GOPENS']).map(c => (
                                <option key={c} value={c}>{getCategoryLabel(c)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-5">
                    <Button
                        onClick={handleSearch}
                        disabled={!collegeName || !courseName || loading}
                        className="!rounded-xl"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <BarChart3 size={18} />
                                Show Trends
                            </>
                        )}
                    </Button>
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
                        {fetchError ? (
                            <div className={`rounded-2xl border p-8 text-center ${
                                isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
                            }`}>
                                <AlertCircle size={40} className={`mx-auto mb-3 ${isDark ? 'text-red-400/60' : 'text-red-400'}`} />
                                <h3 className={`font-semibold font-general mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Connection Error
                                </h3>
                                <p className={`text-sm font-general max-w-md mx-auto mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                    {fetchError}
                                </p>
                                <button
                                    onClick={handleSearch}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors"
                                >
                                    <RefreshCw size={16} />
                                    Try Again
                                </button>
                            </div>
                        ) : chartData.length > 0 ? (
                            <>
                                {/* Insight Banner */}
                                {insight && (
                                    <div className={`rounded-xl border p-4 flex items-center gap-3 ${
                                        insight.trend === 'easier'
                                            ? isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                                            : insight.trend === 'harder'
                                                ? isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                                                : isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                                    }`}>
                                        {insight.trend === 'easier' && <TrendingDown size={20} className="text-emerald-400 flex-shrink-0" />}
                                        {insight.trend === 'harder' && <TrendingUp size={20} className="text-red-400 flex-shrink-0" />}
                                        {insight.trend === 'stable' && <Minus size={20} className="text-yellow-400 flex-shrink-0" />}
                                        <p className={`text-sm font-general ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                            {insight.text}
                                        </p>
                                    </div>
                                )}

                                {/* Chart Controls */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {['rank', 'percentile'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setChartType(type)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                                    chartType === type
                                                        ? 'bg-brand text-white'
                                                        : isDark
                                                            ? 'bg-white/5 text-white/60 hover:bg-white/10'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {type === 'rank' ? 'Cutoff Rank' : 'Percentile'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Stats summary */}
                                    {dataStats && chartType === 'rank' && (
                                        <div className={`flex items-center gap-4 text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                            <span>Min: <strong className={isDark ? 'text-white/70' : 'text-gray-600'}>{dataStats.minRank.toLocaleString()}</strong></span>
                                            <span>Max: <strong className={isDark ? 'text-white/70' : 'text-gray-600'}>{dataStats.maxRank.toLocaleString()}</strong></span>
                                            <span>Avg: <strong className={isDark ? 'text-white/70' : 'text-gray-600'}>{dataStats.avgRank.toLocaleString()}</strong></span>
                                        </div>
                                    )}
                                </div>

                                {/* Chart */}
                                <div className={`rounded-2xl border p-4 md:p-6 ${
                                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                                }`}>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                            />
                                            <XAxis
                                                dataKey="year"
                                                stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                fontSize={12}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                fontSize={12}
                                                tickLine={false}
                                                reversed={chartType === 'rank'}
                                                tickFormatter={val =>
                                                    chartType === 'rank'
                                                        ? val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val
                                                        : `${val}%`
                                                }
                                                label={{
                                                    value: chartType === 'rank' ? 'Cutoff Rank' : 'Percentile',
                                                    angle: -90,
                                                    position: 'insideLeft',
                                                    style: {
                                                        fill: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                                                        fontSize: 11,
                                                    },
                                                }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend
                                                formatter={(value) => {
                                                    const roundNum = value.match(/round(\d)/)?.[1];
                                                    return `CAP Round ${roundNum}`;
                                                }}
                                                wrapperStyle={{ fontSize: 12 }}
                                            />
                                            {availableRounds.map(round => (
                                                <Line
                                                    key={round}
                                                    type="monotone"
                                                    dataKey={chartType === 'rank' ? `round${round}_rank` : `round${round}_percentile`}
                                                    stroke={ROUND_COLORS[round] || '#94a3b8'}
                                                    strokeWidth={2.5}
                                                    dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#0a0a0a' : '#fff' }}
                                                    activeDot={{ r: 6, strokeWidth: 2 }}
                                                    name={`round${round}`}
                                                    connectNulls
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Data Table */}
                                <div className={`rounded-xl border overflow-hidden ${
                                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                                }`}>
                                    <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                        <h4 className={`text-sm font-semibold font-general ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                            Raw Data ({trendData?.length || 0} records)
                                        </h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs font-general">
                                            <thead>
                                                <tr className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
                                                    <th className={`px-4 py-2.5 text-left font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Year</th>
                                                    <th className={`px-4 py-2.5 text-left font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>CAP Round</th>
                                                    <th className={`px-4 py-2.5 text-right font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Cutoff Rank</th>
                                                    <th className={`px-4 py-2.5 text-right font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Percentile</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(trendData || []).map((row, i) => (
                                                    <tr
                                                        key={i}
                                                        className={`border-t ${
                                                            isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <td className={`px-4 py-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{row.year}</td>
                                                        <td className="px-4 py-2">
                                                            <span
                                                                className="inline-flex items-center gap-1.5"
                                                                style={{ color: ROUND_COLORS[row.cap_round] }}
                                                            >
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROUND_COLORS[row.cap_round] }} />
                                                                Round {row.cap_round}
                                                            </span>
                                                        </td>
                                                        <td className={`px-4 py-2 text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {row.cutoff_rank?.toLocaleString() || '—'}
                                                        </td>
                                                        <td className={`px-4 py-2 text-right ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                                            {row.cutoff_percentile || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Legend note */}
                                <div className={`flex items-start gap-2 text-xs font-general ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                                    <p>
                                        Lower rank numbers indicate higher competition. For rank charts, the Y-axis is reversed so upward trends mean easier admission. Data based on DTE Maharashtra official cutoff data.
                                    </p>
                                </div>
                            </>
                        ) : (
                            /* No Data */
                            <div className={`rounded-2xl border p-8 text-center ${
                                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
                            }`}>
                                <BarChart3 size={40} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                                <h3 className={`font-semibold font-general mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    No Trend Data Found
                                </h3>
                                <p className={`text-sm font-general max-w-md mx-auto ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                    No cutoff records found for this combination. Try a different college, branch, or category.
                                </p>
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
                    <div className="text-5xl mb-4">📊</div>
                    <h3 className={`font-semibold font-general text-lg mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                        Visualize Cutoff Trends
                    </h3>
                    <p className={`text-sm font-general max-w-md mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        Select a college and branch above to see how cutoff ranks have changed across years and CAP rounds, with interactive charts and data insights.
                    </p>
                </motion.div>
            )}
        </div>
    );
};

export default CutoffTrends;
