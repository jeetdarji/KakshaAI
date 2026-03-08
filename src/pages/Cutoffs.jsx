import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, BarChart3, Database, AlertCircle, RefreshCw, Star, ArrowRightLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

import CutoffFilters from '../components/cutoffs/CutoffFilters';
import CutoffTable from '../components/cutoffs/CutoffTable';
import CutoffPagination from '../components/cutoffs/CutoffPagination';
import RankPredictor from '../components/cutoffs/RankPredictor';
import CutoffTrends from '../components/cutoffs/CutoffTrends';
import ShortlistPanel from '../components/cutoffs/ShortlistPanel';
import ComparisonView from '../components/cutoffs/ComparisonView';
import SavedSearches from '../components/cutoffs/SavedSearches';

import { searchCutoffs, getFilterOptions, clearFilterOptionsCache } from '../lib/cutoffService';
import {
    addToShortlist, removeFromShortlist, getShortlistKeys, buildShortlistKey,
    getCurrentUser, onAuthStateChange
} from '../lib/preferencesService';

const TABS = [
    { id: 'search', label: 'Search Cutoffs', icon: Search, description: 'Search & filter cutoff data' },
    { id: 'predictor', label: 'Rank Predictor', icon: TrendingUp, description: 'Find colleges for your rank' },
    { id: 'trends', label: 'Trends', icon: BarChart3, description: 'Year-over-year analysis' },
    { id: 'shortlist', label: 'My Shortlist', icon: Star, description: 'Saved colleges' },
];

const PAGE_SIZE = 25;

const Cutoffs = () => {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('search');

    // Filter options (colleges, courses, years, categories — fetched once)
    const [filterOptions, setFilterOptions] = useState(null);
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);
    const [filterOptionsError, setFilterOptionsError] = useState(null);

    // Search tab state
    const [filters, setFilters] = useState({
        collegeName: '',
        courseName: '',
        year: null,
        capRound: null,
        category: '',
        level: '',
    });
    const [results, setResults] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'cutoff_rank', direction: 'asc' });
    const [hasSearched, setHasSearched] = useState(false);

    // Personalization state
    const [user, setUser] = useState(null);
    const [shortlistKeys, setShortlistKeys] = useState(new Map());
    const [shortlistToast, setShortlistToast] = useState(null);
    const [comparisonColleges, setComparisonColleges] = useState([]);
    const [showComparison, setShowComparison] = useState(false);
    const [shortlistRefreshKey, setShortlistRefreshKey] = useState(0);

    const searchTimeoutRef = useRef(null);
    const isInitialMount = useRef(true);

    // ========== Auth state ==========
    useEffect(() => {
        getCurrentUser().then(setUser);
        const unsub = onAuthStateChange((u) => setUser(u));
        return unsub;
    }, []);

    // ========== Shortlist keys (for star state in table/cards) ==========
    const refreshShortlistKeys = useCallback(async () => {
        if (!user) {
            setShortlistKeys(new Map());
            return;
        }
        const keys = await getShortlistKeys();
        setShortlistKeys(keys);
    }, [user]);

    useEffect(() => {
        refreshShortlistKeys();
    }, [refreshShortlistKeys]);

    // ========== Toggle shortlist ==========
    const handleToggleShortlist = useCallback(async (record) => {
        if (!user) {
            setShortlistToast({ type: 'info', text: 'Sign in to save colleges to your shortlist' });
            setTimeout(() => setShortlistToast(null), 3000);
            return;
        }

        const key = buildShortlistKey(record);
        const existingId = shortlistKeys.get(key);

        if (existingId) {
            // Remove
            const { error } = await removeFromShortlist(existingId);
            if (!error) {
                setShortlistKeys(prev => {
                    const next = new Map(prev);
                    next.delete(key);
                    return next;
                });
                setShortlistToast({ type: 'success', text: 'Removed from shortlist' });
                setShortlistRefreshKey(k => k + 1);
            } else {
                setShortlistToast({ type: 'error', text: error });
            }
        } else {
            // Add
            const { data, error } = await addToShortlist(record);
            if (!error && data) {
                setShortlistKeys(prev => {
                    const next = new Map(prev);
                    next.set(key, data.id);
                    return next;
                });
                setShortlistToast({ type: 'success', text: '⭐ Added to shortlist!' });
                setShortlistRefreshKey(k => k + 1);
            } else {
                setShortlistToast({ type: 'error', text: error || 'Failed to add' });
            }
        }
        setTimeout(() => setShortlistToast(null), 2500);
    }, [user, shortlistKeys]);

    // ========== Comparison ==========
    const handleCompare = useCallback((colleges) => {
        setComparisonColleges(colleges);
        setShowComparison(true);
    }, []);

    const handleRemoveFromComparison = useCallback((index) => {
        setComparisonColleges(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
    }, []);

    // ========== Fetch filter options (on mount + manual retry) ==========
    const fetchFilterOptions = useCallback(async () => {
        setFilterOptionsLoading(true);
        setFilterOptionsError(null);
        try {
            clearFilterOptionsCache(); // ensure fresh data on retry
            const options = await getFilterOptions();
            setFilterOptions(options);
            if (options.categories?.length > 0 || options.years?.length > 0) {
                setFilterOptionsError(null);
            } else {
                setFilterOptionsError('Database is temporarily unavailable. Using default values — some filters may be limited. The backend may be restoring after maintenance.');
            }
        } catch (err) {
            console.error('Failed to fetch filter options:', err);
            const msg = err?.message?.includes('Failed to fetch')
                ? 'Cannot connect to the database server. This usually means the project is paused, restoring, or has exceeded its free-tier quota. Please try again in a few minutes.'
                : 'Failed to load filter options. Check your internet connection and try again.';
            setFilterOptionsError(msg);
        } finally {
            setFilterOptionsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFilterOptions();
    }, [fetchFilterOptions]);

    // ========== Search cutoffs (debounced on filter change) ==========
    const performSearch = useCallback(async (page = 1) => {
        const hasAnyFilter = filters.collegeName || filters.courseName || filters.year || filters.capRound || filters.category || filters.level;
        if (!hasAnyFilter) {
            setResults([]);
            setTotalCount(0);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const response = await searchCutoffs(
                {
                    collegeName: filters.collegeName || null,
                    courseName: filters.courseName || null,
                    year: filters.year || null,
                    capRound: filters.capRound || null,
                    category: filters.category || null,
                    level: filters.level || null,
                    sortBy: sortConfig.key,
                    sortOrder: sortConfig.direction,
                },
                page,
                PAGE_SIZE
            );

            setResults(response.data || []);
            setTotalCount(response.count || 0);
            setCurrentPage(page);
        } catch (err) {
            console.error('Search error:', err);
            setResults([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [filters, sortConfig]);

    // Debounce filter changes → trigger search
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            performSearch(1);
        }, 400);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [filters, performSearch]);

    // Re-search when sort changes (not on mount)
    useEffect(() => {
        if (hasSearched) {
            performSearch(currentPage);
        }
    }, [sortConfig]);

    // ========== Handlers ==========
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    const handlePageChange = useCallback((page) => {
        performSearch(page);
        window.scrollTo({ top: 300, behavior: 'smooth' });
    }, [performSearch]);

    const handleReset = useCallback(() => {
        setFilters({ collegeName: '', courseName: '', year: null, capRound: null, category: '', level: '' });
        setResults([]);
        setTotalCount(0);
        setCurrentPage(1);
        setHasSearched(false);
    }, []);

    const handleApplySavedSearch = useCallback((savedFilters) => {
        setFilters(prev => ({ ...prev, ...savedFilters }));
        setActiveTab('search');
    }, []);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const isAuthenticated = !!user;

    // Count shortlisted items for tab badge
    const shortlistCount = shortlistKeys.size;

    return (
        <div className="container mx-auto px-4 md:px-6 py-8 space-y-6 pt-28 md:pt-32 max-w-7xl">
            {/* Shortlist Toast */}
            <AnimatePresence>
                {shortlistToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className={`fixed top-24 left-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium font-general backdrop-blur-xl ${
                            shortlistToast.type === 'success'
                                ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : shortlistToast.type === 'info'
                                    ? isDark ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : isDark ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                    >
                        {shortlistToast.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className={`text-3xl md:text-4xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        College Cutoffs
                    </h1>
                    <p className={`mt-1 font-general text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        Explore MHT-CET engineering cutoff data from DTE Maharashtra
                    </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-general ${
                    isDark ? 'bg-white/5 text-white/40' : 'bg-gray-100 text-gray-500'
                }`}>
                    <Database size={14} />
                    <span>2,86,760+ cutoff records</span>
                </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            >
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const showBadge = tab.id === 'shortlist' && shortlistCount > 0;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-sm font-medium font-general whitespace-nowrap transition-all duration-200 ${
                                isActive
                                    ? isDark
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'bg-white text-gray-900 shadow-md'
                                    : isDark
                                        ? 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                        >
                            <Icon size={18} className={tab.id === 'shortlist' && isActive ? 'text-yellow-400' : ''} />
                            <span>{tab.label}</span>
                            {showBadge && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                                    isActive
                                        ? 'bg-brand text-white'
                                        : isDark ? 'bg-white/10 text-white/50' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {shortlistCount}
                                </span>
                            )}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 rounded-xl bg-brand/10 border border-brand/20"
                                    style={{ zIndex: -1 }}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                        </button>
                    );
                })}
            </motion.div>

            {/* Filter options error */}
            {filterOptionsError && (
                <div className={`p-4 rounded-xl border text-sm font-general ${
                    filterOptionsError.includes('default values')
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        <span className="flex-1">{filterOptionsError}</span>
                        <button
                            onClick={fetchFilterOptions}
                            disabled={filterOptionsLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50 ${
                                filterOptionsError.includes('default values')
                                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                                    : 'bg-red-500/20 hover:bg-red-500/30'
                            }`}
                        >
                            <RefreshCw size={14} className={filterOptionsLoading ? 'animate-spin' : ''} />
                            {filterOptionsLoading ? 'Retrying…' : 'Retry'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'search' && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Filters + Saved Searches */}
                        <CutoffFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleReset}
                            filterOptions={filterOptions}
                            filterOptionsLoading={filterOptionsLoading}
                        />

                        {/* Saved searches bar */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <SavedSearches
                                currentFilters={filters}
                                onApplySearch={handleApplySavedSearch}
                            />
                        </div>

                        {/* Results */}
                        <CutoffTable
                            data={results}
                            loading={loading}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            hasSearched={hasSearched}
                            totalCount={totalCount}
                            shortlistKeys={shortlistKeys}
                            onToggleShortlist={handleToggleShortlist}
                            isAuthenticated={isAuthenticated}
                        />

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <CutoffPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalCount={totalCount}
                                pageSize={PAGE_SIZE}
                                onPageChange={handlePageChange}
                            />
                        )}

                        {/* Info Note */}
                        {hasSearched && results.length > 0 && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-general ${
                                isDark ? 'bg-brand/5 border border-brand/10 text-brand/70' : 'bg-brand/5 border border-brand/10 text-brand'
                            }`}>
                                <AlertCircle size={14} />
                                <span>Data sourced from DTE Maharashtra official cutoff records. Cutoff ranks and percentiles are from actual CAP allotment rounds.</span>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'predictor' && (
                    <motion.div
                        key="predictor"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <RankPredictor
                            filterOptions={filterOptions}
                            shortlistKeys={shortlistKeys}
                            onToggleShortlist={handleToggleShortlist}
                            isAuthenticated={isAuthenticated}
                        />
                    </motion.div>
                )}

                {activeTab === 'trends' && (
                    <motion.div
                        key="trends"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <CutoffTrends filterOptions={filterOptions} />
                    </motion.div>
                )}

                {activeTab === 'shortlist' && (
                    <motion.div
                        key="shortlist"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Comparison View (shown when colleges are selected for comparing) */}
                        <AnimatePresence>
                            {showComparison && comparisonColleges.length >= 2 && (
                                <ComparisonView
                                    colleges={comparisonColleges}
                                    onClose={() => {
                                        setShowComparison(false);
                                        setComparisonColleges([]);
                                    }}
                                    onRemoveCollege={handleRemoveFromComparison}
                                />
                            )}
                        </AnimatePresence>

                        {/* Shortlist Panel */}
                        {(!showComparison || comparisonColleges.length < 2) && (
                            <ShortlistPanel
                                key={shortlistRefreshKey}
                                onCompare={handleCompare}
                                onRefresh={refreshShortlistKeys}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Cutoffs;
