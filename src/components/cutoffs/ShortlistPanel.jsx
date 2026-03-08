import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Trash2, Edit3, Check, X, ChevronDown, ChevronUp,
    AlertCircle, RefreshCw, ArrowRightLeft, LogIn, FileText, MapPin
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
    getShortlist, removeFromShortlist, updateShortlistNotes,
    getCurrentUser
} from '../../lib/preferencesService';
import { getCategoryShort } from '../../lib/cutoffService';

const ShortlistPanel = ({ onCompare, onRefresh }) => {
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [shortlist, setShortlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editingId, setEditingId] = useState(null);
    const [editNotes, setEditNotes] = useState('');
    const [removingId, setRemovingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    // Check auth and fetch shortlist
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser) {
            setLoading(false);
            return;
        }

        const { data, error: fetchError } = await getShortlist();
        if (fetchError) {
            setError(fetchError);
        } else {
            setShortlist(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle remove
    const handleRemove = async (id) => {
        setRemovingId(id);
        const { error: removeError } = await removeFromShortlist(id);
        if (removeError) {
            setError(removeError);
        } else {
            setShortlist(prev => prev.filter(item => item.id !== id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
        setRemovingId(null);
        onRefresh?.();
    };

    // Handle notes edit
    const startEditing = (id, currentNotes) => {
        setEditingId(id);
        setEditNotes(currentNotes || '');
    };

    const saveNotes = async (id) => {
        const { error: updateError } = await updateShortlistNotes(id, editNotes);
        if (updateError) {
            setError(updateError);
        } else {
            setShortlist(prev => prev.map(item =>
                item.id === id ? { ...item, data: { ...item.data, notes: editNotes } } : item
            ));
        }
        setEditingId(null);
    };

    // Toggle selection for comparison
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (next.size >= 4) return prev; // max 4
                next.add(id);
            }
            return next;
        });
    };

    // Compare selected
    const handleCompare = () => {
        const selected = shortlist.filter(item => selectedIds.has(item.id));
        if (selected.length >= 2 && onCompare) {
            onCompare(selected.map(s => s.data));
        }
    };

    // Not logged in state
    if (user === null) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-8 text-center ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'
                }`}
            >
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                    <LogIn size={28} className="text-brand" />
                </div>
                <h3 className={`text-lg font-semibold font-general mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Sign In to Shortlist
                </h3>
                <p className={`text-sm font-general mb-6 max-w-sm mx-auto ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Save your favorite colleges, add notes, and compare side-by-side. Your shortlist syncs across all devices.
                </p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login')}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-full font-semibold text-sm transition-colors inline-flex items-center gap-2"
                >
                    <LogIn size={16} />
                    Sign In
                </motion.button>
            </motion.div>
        );
    }

    // Loading state
    if (loading || user === undefined) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                            <div className="flex-1 space-y-2">
                                <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '70%' }} />
                                <div className={`h-3 rounded animate-pulse ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} style={{ width: '50%' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                        <Star size={20} className="text-yellow-400 fill-yellow-400" />
                    </div>
                    <div>
                        <h3 className={`font-semibold font-general ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            My Shortlist
                        </h3>
                        <p className={`text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            {shortlist.length} college{shortlist.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.size >= 2 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleCompare}
                            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                        >
                            <ArrowRightLeft size={14} />
                            Compare ({selectedIds.size})
                        </motion.button>
                    )}
                    <button
                        onClick={fetchData}
                        className={`p-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-400'
                        }`}
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Selection hint */}
            {shortlist.length >= 2 && selectedIds.size === 0 && (
                <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-general ${
                    isDark ? 'bg-brand/5 border border-brand/10 text-brand/60' : 'bg-brand/5 border border-brand/10 text-brand'
                }`}>
                    <ArrowRightLeft size={14} />
                    Select 2-4 colleges to compare side-by-side
                </div>
            )}

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border text-sm font-general flex items-center gap-2 ${
                        isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                >
                    <AlertCircle size={16} />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="hover:opacity-70">
                        <X size={14} />
                    </button>
                </motion.div>
            )}

            {/* Empty state */}
            {shortlist.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border p-8 text-center ${
                        isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'
                    }`}
                >
                    <div className="text-5xl mb-4">⭐</div>
                    <h3 className={`font-semibold font-general text-lg mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                        No colleges shortlisted yet
                    </h3>
                    <p className={`text-sm font-general max-w-sm mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        Start shortlisting colleges from the search results or rank predictor by clicking the ⭐ star icon!
                    </p>
                </motion.div>
            )}

            {/* Shortlist Cards */}
            <AnimatePresence>
                {shortlist.map((item, index) => {
                    const d = item.data || {};
                    const isSelected = selectedIds.has(item.id);
                    const isExpanded = expandedId === item.id;
                    const isEditing = editingId === item.id;
                    const isRemoving = removingId === item.id;

                    return (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.25 }}
                            className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                                isSelected
                                    ? isDark
                                        ? 'border-brand/40 bg-brand/5 ring-1 ring-brand/20'
                                        : 'border-brand/40 bg-brand/5 ring-1 ring-brand/20'
                                    : isDark
                                        ? 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                        >
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Selection checkbox */}
                                    <button
                                        onClick={() => toggleSelect(item.id)}
                                        className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                                            isSelected
                                                ? 'bg-brand border-brand text-white'
                                                : isDark
                                                    ? 'border-white/20 hover:border-white/40'
                                                    : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-semibold font-general text-sm truncate pr-2 ${
                                                    isDark ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                    {d.college_name}
                                                </h4>
                                                <p className={`text-xs font-general mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                                    {d.course_name}
                                                </p>
                                            </div>
                                            <Star size={16} className="text-yellow-400 fill-yellow-400 flex-shrink-0 mt-0.5" />
                                        </div>

                                        {/* Stats row */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            {d.cutoff_rank && (
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    isDark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    Rank: {d.cutoff_rank.toLocaleString()}
                                                </span>
                                            )}
                                            {d.cutoff_percentile && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand/10 text-brand">
                                                    {Number(d.cutoff_percentile).toFixed(2)}%
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                isDark ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-500'
                                            }`}>
                                                {d.year} R{d.cap_round}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                isDark ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-500'
                                            }`}>
                                                {getCategoryShort(d.category)}
                                            </span>
                                            {d.city && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                                    isDark ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-gray-400'
                                                }`}>
                                                    <MapPin size={10} />
                                                    {d.city}
                                                </span>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        {d.notes && !isEditing && (
                                            <div className={`mt-2 flex items-start gap-1.5 text-xs ${
                                                isDark ? 'text-white/40' : 'text-gray-400'
                                            }`}>
                                                <FileText size={12} className="mt-0.5 flex-shrink-0" />
                                                <span className="line-clamp-2">{d.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded section */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                                {/* Notes editor */}
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            autoFocus
                                                            value={editNotes}
                                                            onChange={(e) => setEditNotes(e.target.value)}
                                                            placeholder="Add your notes about this college..."
                                                            rows={3}
                                                            className={`w-full text-sm rounded-lg border p-2.5 resize-none font-general focus:outline-none focus:border-brand/50 transition-colors ${
                                                                isDark
                                                                    ? 'bg-dark-bg border-white/10 text-white placeholder-white/30'
                                                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                                            }`}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => saveNotes(item.id)}
                                                                className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                                                            >
                                                                <Check size={12} />
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                                    isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                }`}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {/* Details grid */}
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                            {d.college_code && (
                                                                <DetailItem label="College Code" value={d.college_code} isDark={isDark} />
                                                            )}
                                                            {d.course_code && (
                                                                <DetailItem label="Course Code" value={d.course_code} isDark={isDark} />
                                                            )}
                                                            {d.level && (
                                                                <DetailItem label="Level" value={d.level} isDark={isDark} />
                                                            )}
                                                        </div>

                                                        {/* Notes display & edit trigger */}
                                                        <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                    Notes
                                                                </span>
                                                                <button
                                                                    onClick={() => startEditing(item.id, d.notes)}
                                                                    className={`text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                                                                        isDark ? 'text-brand/70 hover:text-brand' : 'text-brand hover:text-brand-dark'
                                                                    }`}
                                                                >
                                                                    <Edit3 size={12} />
                                                                    {d.notes ? 'Edit' : 'Add Notes'}
                                                                </button>
                                                            </div>
                                                            {d.notes ? (
                                                                <p className={`text-sm font-general ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                                                    {d.notes}
                                                                </p>
                                                            ) : (
                                                                <p className={`text-sm font-general italic ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                                    No notes yet
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Actions row */}
                                <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                                    isDark ? 'border-white/5' : 'border-gray-100'
                                }`}>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                                                isDark
                                                    ? 'text-white/50 hover:text-white/70 hover:bg-white/5'
                                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            {isExpanded ? 'Less' : 'Details'}
                                        </button>
                                        <button
                                            onClick={() => startEditing(item.id, d.notes)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                                                isDark
                                                    ? 'text-white/50 hover:text-white/70 hover:bg-white/5'
                                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Edit3 size={12} />
                                            Notes
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(item.id)}
                                        disabled={isRemoving}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                                            isDark
                                                ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                                                : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                        } disabled:opacity-40`}
                                    >
                                        {isRemoving ? (
                                            <div className="w-3 h-3 border border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 size={12} />
                                        )}
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

const DetailItem = ({ label, value, isDark }) => (
    <div>
        <span className={`text-xs block mb-0.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{label}</span>
        <span className={`text-sm font-general ${isDark ? 'text-white/70' : 'text-gray-700'}`}>{value}</span>
    </div>
);

export default ShortlistPanel;
