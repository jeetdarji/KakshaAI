import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ArrowUpDown, ChevronRight, Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getCategoryShort } from '../../lib/cutoffService';
import { buildShortlistKey } from '../../lib/preferencesService';

const CutoffTable = ({ data, loading, sortConfig, onSort, shortlistKeys, onToggleShortlist, isAuthenticated }) => {
    const { isDark } = useTheme();
    const [expandedRow, setExpandedRow] = useState(null);

    const sortBy = sortConfig?.key;
    const sortOrder = sortConfig?.direction;

    const columns = [
        { key: 'shortlist', label: '', sortable: false, minW: 'min-w-[40px]' },
        { key: 'college_name', label: 'College', sortable: true, minW: 'min-w-[200px]' },
        { key: 'course_name', label: 'Branch', sortable: true, minW: 'min-w-[160px]' },
        { key: 'cutoff_rank', label: 'Rank', sortable: true, minW: 'min-w-[90px]' },
        { key: 'cutoff_percentile', label: 'Percentile', sortable: true, minW: 'min-w-[100px]' },
        { key: 'category', label: 'Category', sortable: false, minW: 'min-w-[100px]' },
        { key: 'year', label: 'Year', sortable: true, minW: 'min-w-[70px]' },
        { key: 'cap_round', label: 'Round', sortable: true, minW: 'min-w-[70px]' },
    ];

    const isShortlisted = useCallback((row) => {
        if (!shortlistKeys || shortlistKeys.size === 0) return false;
        const key = buildShortlistKey(row);
        return shortlistKeys.has(key);
    }, [shortlistKeys]);

    const handleStarClick = useCallback((e, row) => {
        e.stopPropagation();
        if (onToggleShortlist) {
            onToggleShortlist(row);
        }
    }, [onToggleShortlist]);

    const handleSort = (key) => {
        if (!columns.find(c => c.key === key)?.sortable) return;
        const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
        onSort(key, newOrder);
    };

    const SortIcon = ({ columnKey }) => {
        if (sortBy !== columnKey) {
            return <ArrowUpDown size={14} className="opacity-30" />;
        }
        return sortOrder === 'asc' 
            ? <ChevronUp size={14} className="text-brand" /> 
            : <ChevronDown size={14} className="text-brand" />;
    };

    const formatRank = (rank) => {
        if (rank == null) return '—';
        return rank.toLocaleString();
    };

    const formatPercentile = (pct) => {
        if (pct == null) return '—';
        return Number(pct).toFixed(2) + '%';
    };

    const getRankColor = (rank) => {
        if (rank == null) return '';
        if (rank <= 5000) return 'text-emerald-400';
        if (rank <= 20000) return 'text-yellow-400';
        return isDark ? 'text-white/70' : 'text-gray-600';
    };

    // Skeleton loader
    if (loading) {
        return (
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b font-general ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                {columns.map(col => (
                                    <th key={col.key} className={`p-4 ${col.minW}`}>
                                        <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '60%' }} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                    {columns.map(col => (
                                        <td key={col.key} className="p-4">
                                            <div 
                                                className={`h-4 rounded animate-pulse ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} 
                                                style={{ width: `${40 + Math.random() * 40}%`, animationDelay: `${i * 0.05}s` }} 
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Empty state
    if (!data || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-12 text-center ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}
            >
                <div className={`text-4xl mb-3`}>🔍</div>
                <h3 className={`font-semibold font-general text-lg mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    No Results Found
                </h3>
                <p className={`text-sm font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Try adjusting your filters or search term to find cutoff data.
                </p>
            </motion.div>
        );
    }

    return (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className={`border-b font-general ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`p-4 font-semibold text-sm ${col.minW} ${
                                        isDark ? 'text-white/70' : 'text-gray-600'
                                    } ${col.sortable ? 'cursor-pointer select-none hover:text-brand transition-colors' : ''}`}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.label}
                                        {col.sortable && <SortIcon columnKey={col.key} />}
                                    </div>
                                </th>
                            ))}
                            <th className={`p-4 w-10 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <React.Fragment key={row.id || index}>
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02, duration: 0.2 }}
                                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                                    className={`border-b transition-colors cursor-pointer ${
                                        isDark 
                                            ? 'border-white/5 hover:bg-white/5' 
                                            : 'border-gray-100 hover:bg-gray-50'
                                    } ${expandedRow === index ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''}`}
                                >
                                    {/* Shortlist Star */}
                                    <td className="p-2 pl-4">
                                        <button
                                            onClick={(e) => handleStarClick(e, row)}
                                            className={`p-1.5 rounded-lg transition-all duration-200 ${
                                                isShortlisted(row)
                                                    ? 'text-yellow-400 hover:text-yellow-300 scale-110'
                                                    : isAuthenticated
                                                        ? isDark
                                                            ? 'text-white/20 hover:text-yellow-400/70 hover:bg-white/5'
                                                            : 'text-gray-300 hover:text-yellow-400/70 hover:bg-gray-50'
                                                        : isDark
                                                            ? 'text-white/10 cursor-default'
                                                            : 'text-gray-200 cursor-default'
                                            }`}
                                            title={isAuthenticated ? (isShortlisted(row) ? 'Remove from shortlist' : 'Add to shortlist') : 'Sign in to shortlist'}
                                        >
                                            <Star size={16} fill={isShortlisted(row) ? 'currentColor' : 'none'} />
                                        </button>
                                    </td>
                                    {/* College Name */}
                                    <td className={`p-4 font-medium font-general text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        <div className="max-w-[250px] truncate" title={row.college_name}>
                                            {row.college_name}
                                        </div>
                                    </td>
                                    {/* Branch */}
                                    <td className={`p-4 font-general text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                                        <div className="max-w-[200px] truncate" title={row.course_name}>
                                            {row.course_name}
                                        </div>
                                    </td>
                                    {/* Rank */}
                                    <td className={`p-4 font-bold font-general text-sm ${getRankColor(row.cutoff_rank)}`}>
                                        {formatRank(row.cutoff_rank)}
                                    </td>
                                    {/* Percentile */}
                                    <td className="p-4 text-brand font-bold font-general text-sm">
                                        {formatPercentile(row.cutoff_percentile)}
                                    </td>
                                    {/* Category */}
                                    <td className={`p-4 font-general text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            isDark ? 'bg-white/10' : 'bg-gray-100'
                                        }`} title={getCategoryShort(row.category)}>
                                            {row.category}
                                        </span>
                                    </td>
                                    {/* Year */}
                                    <td className={`p-4 font-general text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                        {row.year}
                                    </td>
                                    {/* Round */}
                                    <td className={`p-4 font-general text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                        R{row.cap_round}
                                    </td>
                                    {/* Expand indicator */}
                                    <td className={`p-4 ${isDark ? 'text-white/30' : 'text-gray-300'}`}>
                                        <ChevronRight 
                                            size={16} 
                                            className={`transition-transform duration-200 ${expandedRow === index ? 'rotate-90' : ''}`} 
                                        />
                                    </td>
                                </motion.tr>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {expandedRow === index && (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <td colSpan={9} className={`px-4 pb-4 ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                                    <DetailItem 
                                                        label="College Code" 
                                                        value={row.college_code} 
                                                        isDark={isDark} 
                                                    />
                                                    <DetailItem 
                                                        label="Course Code" 
                                                        value={row.course_code} 
                                                        isDark={isDark} 
                                                    />
                                                    <DetailItem 
                                                        label="Category" 
                                                        value={getCategoryShort(row.category)} 
                                                        isDark={isDark} 
                                                    />
                                                    <DetailItem 
                                                        label="Status" 
                                                        value={row.status || '—'} 
                                                        isDark={isDark} 
                                                        colSpan 
                                                    />
                                                    <DetailItem 
                                                        label="Level" 
                                                        value={row.level || '—'} 
                                                        isDark={isDark} 
                                                        colSpan 
                                                    />
                                                    <DetailItem 
                                                        label="Stage" 
                                                        value={row.stage || '—'} 
                                                        isDark={isDark} 
                                                    />
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DetailItem = ({ label, value, isDark, colSpan }) => (
    <div className={colSpan ? 'md:col-span-2' : ''}>
        <span className={`text-xs font-medium block mb-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            {label}
        </span>
        <span className={`text-sm font-general ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            {value}
        </span>
    </div>
);

export default CutoffTable;
