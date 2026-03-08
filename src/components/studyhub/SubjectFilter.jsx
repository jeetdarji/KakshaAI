import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const SubjectFilter = ({
    selectedSubject = 'all',
    onSubjectChange,
    selectedClass = 'all',
    onClassChange,
    selectedProgress = 'all',
    onProgressChange,
    searchQuery = '',
    onSearchChange,
    showAdvanced = false,
    className
}) => {
    const { isDark } = useTheme();
    const subjects = [
        { value: 'all', label: 'All Subjects' },
        { value: 'Physics', label: 'Physics' },
        { value: 'Chemistry', label: 'Chemistry' },
        { value: 'Maths', label: 'Mathematics' },
    ];

    const classes = [
        { value: 'all', label: 'All Classes' },
        { value: '11', label: 'Class 11' },
        { value: '12', label: 'Class 12' },
    ];

    const progressOptions = [
        { value: 'all', label: 'All Progress' },
        { value: 'not-started', label: 'Not Started' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
    ];

    const selectClasses = isDark 
        ? "bg-dark-card border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-general text-sm appearance-none cursor-pointer pr-10"
        : "bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-general text-sm appearance-none cursor-pointer pr-10";

    return (
        <div className={cn('flex flex-wrap gap-4', className)}>
            {/* Search Input */}
            <div className="relative flex-grow min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input
                    type="text"
                    placeholder="Search chapters..."
                    className={`w-full ${isDark ? 'bg-dark-card border-white/10 text-white placeholder:text-white/30' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'} border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-general`}
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                />
            </div>

            {/* Subject Filter */}
            <div className="relative">
                <select
                    className={selectClasses}
                    value={selectedSubject}
                    onChange={(e) => onSubjectChange?.(e.target.value)}
                >
                    {subjects.map(subject => (
                        <option key={subject.value} value={subject.value}>
                            {subject.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
            </div>

            {/* Class Filter */}
            {showAdvanced && (
                <>
                    <div className="relative">
                        <select
                            className={selectClasses}
                            value={selectedClass}
                            onChange={(e) => onClassChange?.(e.target.value)}
                        >
                            {classes.map(cls => (
                                <option key={cls.value} value={cls.value}>
                                    {cls.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
                    </div>

                    {/* Progress Filter */}
                    <div className="relative">
                        <select
                            className={selectClasses}
                            value={selectedProgress}
                            onChange={(e) => onProgressChange?.(e.target.value)}
                        >
                            {progressOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
                    </div>
                </>
            )}
        </div>
    );
};

export default SubjectFilter;
