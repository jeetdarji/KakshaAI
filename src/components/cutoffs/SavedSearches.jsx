import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bookmark, Trash2, Search, Clock, X, Save, AlertCircle, LogIn, Play
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
    saveSearch, getSavedSearches, deleteSavedSearch,
    getCurrentUser
} from '../../lib/preferencesService';

const SavedSearches = ({ currentFilters, onApplySearch }) => {
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [savedSearches, setSavedSearches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(undefined);
    const [error, setError] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Check auth and fetch saved searches
    const fetchData = useCallback(async () => {
        setLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
            const { data, error: fetchError } = await getSavedSearches();
            if (fetchError) {
                setError(fetchError);
            } else {
                setSavedSearches(data || []);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Check if any filter is active
    const hasActiveFilters = currentFilters && Object.values(currentFilters).some(v => v && v !== '');

    // Save current search
    const handleSave = async () => {
        if (!searchName.trim()) return;
        setSaving(true);
        setError(null);

        const { data, error: saveError } = await saveSearch(searchName.trim(), currentFilters);
        if (saveError) {
            setError(saveError);
        } else {
            setSavedSearches(prev => [data, ...prev]);
            setShowSaveModal(false);
            setSearchName('');
            setSuccessMessage('Search saved successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
        setSaving(false);
    };

    // Delete a saved search
    const handleDelete = async (id) => {
        setDeletingId(id);
        const { error: delError } = await deleteSavedSearch(id);
        if (delError) {
            setError(delError);
        } else {
            setSavedSearches(prev => prev.filter(s => s.id !== id));
        }
        setDeletingId(null);
    };

    // Apply a saved search
    const handleApply = (search) => {
        const filters = search.data?.filters;
        if (filters && onApplySearch) {
            onApplySearch(filters);
        }
    };

    // Format filter summary
    const getFilterSummary = (filters) => {
        if (!filters) return 'No filters';
        const parts = [];
        if (filters.collegeName) parts.push(`"${filters.collegeName}"`);
        if (filters.courseName) parts.push(filters.courseName);
        if (filters.year) parts.push(`${filters.year}`);
        if (filters.capRound) parts.push(`R${filters.capRound}`);
        if (filters.category) parts.push(filters.category);
        if (filters.level) parts.push(filters.level);
        if (filters.city) parts.push(filters.city);
        return parts.length > 0 ? parts.join(' · ') : 'No filters set';
    };

    // Time ago
    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    // Not logged in — show save button that prompts login
    if (user === null) {
        return hasActiveFilters ? (
            <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                    isDark
                        ? 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                title="Sign in to save searches"
            >
                <Save size={14} />
                Save Search
            </motion.button>
        ) : null;
    }

    // Loading
    if (loading || user === undefined) {
        return null; // Don't show anything while loading
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Save button */}
            {hasActiveFilters && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSaveModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand/10 text-brand hover:bg-brand/20 transition-colors inline-flex items-center gap-1.5"
                >
                    <Save size={14} />
                    Save Search
                </motion.button>
            )}

            {/* Saved searches dropdown chips */}
            {savedSearches.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-general ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        <Bookmark size={12} className="inline mr-1" />
                        Saved:
                    </span>
                    {savedSearches.slice(0, 5).map((search) => (
                        <div
                            key={search.id}
                            className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                                isDark
                                    ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                            }`}
                        >
                            <button
                                onClick={() => handleApply(search)}
                                className="inline-flex items-center gap-1"
                                title={getFilterSummary(search.data?.filters)}
                            >
                                <Play size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                {search.data?.name || 'Untitled'}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(search.id);
                                }}
                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full ${
                                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-300'
                                }`}
                            >
                                {deletingId === search.id ? (
                                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <X size={10} />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Success message */}
            <AnimatePresence>
                {successMessage && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-xs font-medium text-emerald-400"
                    >
                        ✓ {successMessage}
                    </motion.span>
                )}
            </AnimatePresence>

            {/* Save Modal */}
            <AnimatePresence>
                {showSaveModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSaveModal(false)}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`relative w-full max-w-md rounded-2xl border p-6 ${
                                isDark
                                    ? 'bg-dark-card border-white/10'
                                    : 'bg-white border-gray-200 shadow-2xl'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
                                    <Bookmark size={20} className="text-brand" />
                                </div>
                                <div>
                                    <h3 className={`font-semibold font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Save This Search
                                    </h3>
                                    <p className={`text-xs font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                        Give your search a name to quickly apply it later
                                    </p>
                                </div>
                            </div>

                            {/* Current filters preview */}
                            <div className={`p-3 rounded-lg mb-4 text-xs font-general ${
                                isDark ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-500'
                            }`}>
                                <span className="font-medium">Filters: </span>
                                {getFilterSummary(currentFilters)}
                            </div>

                            <input
                                autoFocus
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                placeholder="e.g., My OBC CS Colleges"
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                className={`w-full text-sm rounded-xl border px-4 py-3 font-general mb-4 focus:outline-none focus:border-brand/50 transition-colors ${
                                    isDark
                                        ? 'bg-dark-bg border-white/10 text-white placeholder-white/30'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                }`}
                            />

                            {error && (
                                <div className={`p-2.5 rounded-lg mb-4 text-xs flex items-center gap-2 ${
                                    isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                }`}>
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={() => { setShowSaveModal(false); setSearchName(''); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                        isDark
                                            ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!searchName.trim() || saving}
                                    className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} />
                                            Save
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SavedSearches;
