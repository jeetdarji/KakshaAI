import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { getCategoryLabel, getCategoryGroups, getPopularCategories } from '../../lib/cutoffService';

const CutoffFilters = ({ filters, onFilterChange, filterOptions, onReset }) => {
    const { isDark } = useTheme();
    const [showFilters, setShowFilters] = useState(true);
    const [collegeSearch, setCollegeSearch] = useState(filters.collegeName || '');
    const [showCollegeSuggestions, setShowCollegeSuggestions] = useState(false);
    const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const collegeRef = useRef(null);
    const courseRef = useRef(null);

    // Debounce college name search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (collegeSearch !== filters.collegeName) {
                onFilterChange({ ...filters, collegeName: collegeSearch });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [collegeSearch]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (collegeRef.current && !collegeRef.current.contains(e.target)) {
                setShowCollegeSuggestions(false);
            }
            if (courseRef.current && !courseRef.current.contains(e.target)) {
                setShowCourseSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Filter colleges for suggestions
    const filteredColleges = (filterOptions?.colleges || [])
        .filter(c => collegeSearch && c.toLowerCase().includes(collegeSearch.toLowerCase()))
        .slice(0, 8);

    // Filter courses for suggestions
    const filteredCourses = (filterOptions?.courses || [])
        .filter(c => courseSearch ? c.toLowerCase().includes(courseSearch.toLowerCase()) : true);

    // Get grouped categories for the dropdown
    const categoryMap = getPopularCategories();
    const categoryGroups = getCategoryGroups();
    const allCategories = filterOptions?.categories || [];

    // Build grouped options
    const groupedCategories = categoryGroups.map(group => {
        const items = allCategories.filter(code => categoryMap[code]?.group === group.group);
        return { ...group, items };
    }).filter(g => g.items.length > 0);

    // Uncategorized
    const mappedCodes = new Set(Object.keys(categoryMap));
    const uncategorized = allCategories.filter(c => !mappedCodes.has(c));

    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value || null });
    };

    // Active filter count
    const activeCount = [
        filters.collegeName,
        filters.courseName,
        filters.year,
        filters.capRound,
        filters.category,
        filters.level,
        filters.city,
    ].filter(Boolean).length;

    const selectClass = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 transition-colors appearance-none cursor-pointer ${
        isDark 
            ? 'bg-dark-bg border-white/10 text-white' 
            : 'bg-white border-gray-200 text-gray-900'
    }`;

    const labelClass = `text-xs font-medium mb-1.5 block font-general ${
        isDark ? 'text-white/50' : 'text-gray-500'
    }`;

    return (
        <div className={`rounded-2xl border transition-all duration-300 ${
            isDark 
                ? 'bg-white/5 border-white/10' 
                : 'bg-white border-gray-200 shadow-sm'
        }`}>
            {/* Filter Header */}
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full flex items-center justify-between p-4 md:p-5 ${
                    showFilters ? 'border-b' : ''
                } ${isDark ? 'border-white/10' : 'border-gray-100'}`}
            >
                <div className="flex items-center gap-3">
                    <Filter size={18} className="text-brand" />
                    <span className={`font-semibold font-general text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Filters
                    </span>
                    {activeCount > 0 && (
                        <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {activeCount}
                        </span>
                    )}
                </div>
                <ChevronDown 
                    size={18} 
                    className={`transition-transform duration-200 ${isDark ? 'text-white/40' : 'text-gray-400'} ${showFilters ? 'rotate-180' : ''}`} 
                />
            </button>

            {/* Filter Body */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 md:p-5 space-y-4">
                            {/* Row 1: College Search + Course */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* College Name Search */}
                                <div ref={collegeRef} className="relative">
                                    <label className={labelClass}>College Name</label>
                                    <div className="relative">
                                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search college..."
                                            value={collegeSearch}
                                            onChange={(e) => {
                                                setCollegeSearch(e.target.value);
                                                setShowCollegeSuggestions(true);
                                            }}
                                            onFocus={() => collegeSearch && setShowCollegeSuggestions(true)}
                                            className={`w-full border rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-brand/50 transition-colors ${
                                                isDark 
                                                    ? 'bg-dark-bg border-white/10 text-white placeholder:text-white/30' 
                                                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                                            }`}
                                        />
                                        {collegeSearch && (
                                            <button
                                                onClick={() => {
                                                    setCollegeSearch('');
                                                    onFilterChange({ ...filters, collegeName: '' });
                                                }}
                                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 ${
                                                    isDark ? 'text-white/40' : 'text-gray-400'
                                                }`}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {/* College Suggestions Dropdown */}
                                    <AnimatePresence>
                                        {showCollegeSuggestions && filteredColleges.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className={`absolute z-50 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                                                    isDark 
                                                        ? 'bg-dark-card border-white/10' 
                                                        : 'bg-white border-gray-200'
                                                }`}
                                            >
                                                {filteredColleges.map((college, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setCollegeSearch(college);
                                                            onFilterChange({ ...filters, collegeName: college });
                                                            setShowCollegeSuggestions(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm font-general truncate transition-colors ${
                                                            isDark 
                                                                ? 'hover:bg-white/10 text-white/80' 
                                                                : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        {college}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Course/Branch Search */}
                                <div ref={courseRef} className="relative">
                                    <label className={labelClass}>Branch / Course</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search branch..."
                                            value={filters.courseName || courseSearch}
                                            onChange={(e) => {
                                                setCourseSearch(e.target.value);
                                                if (!e.target.value) {
                                                    onFilterChange({ ...filters, courseName: null });
                                                }
                                                setShowCourseSuggestions(true);
                                            }}
                                            onFocus={() => setShowCourseSuggestions(true)}
                                            className={`${selectClass} ${filters.courseName ? 'pr-8' : ''}`}
                                        />
                                        {filters.courseName && (
                                            <button
                                                onClick={() => {
                                                    setCourseSearch('');
                                                    onFilterChange({ ...filters, courseName: null });
                                                }}
                                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 ${
                                                    isDark ? 'text-white/40' : 'text-gray-400'
                                                }`}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <AnimatePresence>
                                        {showCourseSuggestions && filteredCourses.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className={`absolute z-50 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                                                    isDark 
                                                        ? 'bg-dark-card border-white/10' 
                                                        : 'bg-white border-gray-200'
                                                }`}
                                            >
                                                {filteredCourses.map((course, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setCourseSearch('');
                                                            onFilterChange({ ...filters, courseName: course });
                                                            setShowCourseSuggestions(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm font-general truncate transition-colors ${
                                                            isDark 
                                                                ? 'hover:bg-white/10 text-white/80' 
                                                                : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        {course}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Row 2: Year, CAP Round, Category, Level */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Year */}
                                <div>
                                    <label className={labelClass}>Year</label>
                                    <select
                                        value={filters.year || ''}
                                        onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : null)}
                                        className={selectClass}
                                    >
                                        <option value="">All Years</option>
                                        {(filterOptions?.years || [2025, 2024, 2023]).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* CAP Round */}
                                <div>
                                    <label className={labelClass}>CAP Round</label>
                                    <select
                                        value={filters.capRound || ''}
                                        onChange={(e) => handleChange('capRound', e.target.value ? parseInt(e.target.value) : null)}
                                        className={selectClass}
                                    >
                                        <option value="">All Rounds</option>
                                        {(filterOptions?.capRounds || [1, 2, 3, 4]).map(r => (
                                            <option key={r} value={r}>Round {r}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category (Grouped) */}
                                <div>
                                    <label className={labelClass}>Category</label>
                                    <select
                                        value={filters.category || ''}
                                        onChange={(e) => handleChange('category', e.target.value || null)}
                                        className={selectClass}
                                    >
                                        <option value="">All Categories</option>
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

                                {/* Level */}
                                <div>
                                    <label className={labelClass}>Level</label>
                                    <select
                                        value={filters.level || ''}
                                        onChange={(e) => handleChange('level', e.target.value || null)}
                                        className={selectClass}
                                    >
                                        <option value="">All Levels</option>
                                        {(filterOptions?.levels || []).map(l => (
                                            <option key={l} value={l}>
                                                {l === 'State Level' ? 'State Level' : l.length > 40 ? l.substring(0, 40) + '...' : l}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* City / District */}
                                <div>
                                    <label className={labelClass}>City / District</label>
                                    <select
                                        value={filters.city || ''}
                                        onChange={(e) => handleChange('city', e.target.value || null)}
                                        className={selectClass}
                                    >
                                        <option value="">All Cities</option>
                                        {(filterOptions?.cities || []).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Active Filters Chips + Reset */}
                            {activeCount > 0 && (
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                    {filters.collegeName && (
                                        <FilterChip 
                                            label={`College: ${filters.collegeName.length > 20 ? filters.collegeName.substring(0, 20) + '...' : filters.collegeName}`}
                                            onRemove={() => { setCollegeSearch(''); onFilterChange({ ...filters, collegeName: '' }); }}
                                            isDark={isDark}
                                        />
                                    )}
                                    {filters.courseName && (
                                        <FilterChip 
                                            label={`Branch: ${filters.courseName.length > 25 ? filters.courseName.substring(0, 25) + '...' : filters.courseName}`}
                                            onRemove={() => { setCourseSearch(''); onFilterChange({ ...filters, courseName: null }); }}
                                            isDark={isDark}
                                        />
                                    )}
                                    {filters.year && (
                                        <FilterChip label={`Year: ${filters.year}`} onRemove={() => handleChange('year', null)} isDark={isDark} />
                                    )}
                                    {filters.capRound && (
                                        <FilterChip label={`Round: ${filters.capRound}`} onRemove={() => handleChange('capRound', null)} isDark={isDark} />
                                    )}
                                    {filters.category && (
                                        <FilterChip label={getCategoryLabel(filters.category)} onRemove={() => handleChange('category', null)} isDark={isDark} />
                                    )}
                                    {filters.level && (
                                        <FilterChip 
                                            label={filters.level === 'State Level' ? 'State Level' : 'Home University'} 
                                            onRemove={() => handleChange('level', null)} 
                                            isDark={isDark} 
                                        />
                                    )}
                                    {filters.city && (
                                        <FilterChip 
                                            label={`City: ${filters.city}`} 
                                            onRemove={() => handleChange('city', null)} 
                                            isDark={isDark} 
                                        />
                                    )}
                                    <button
                                        onClick={() => {
                                            setCollegeSearch('');
                                            setCourseSearch('');
                                            onReset();
                                        }}
                                        className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-light transition-colors ml-2"
                                    >
                                        <RotateCcw size={12} />
                                        Reset All
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Small helper component for filter chips
const FilterChip = ({ label, onRemove, isDark }) => (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isDark 
            ? 'bg-brand/20 text-brand-light border border-brand/30' 
            : 'bg-brand/10 text-brand-dark border border-brand/20'
    }`}>
        {label}
        <button onClick={onRemove} className="hover:text-red-400 transition-colors">
            <X size={12} />
        </button>
    </span>
);

export default CutoffFilters;
