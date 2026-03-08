import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const CutoffPagination = ({ currentPage, totalCount, pageSize, onPageChange }) => {
    const { isDark } = useTheme();
    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages <= 1) return null;

    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalCount);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    };

    const btnBase = `inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
        isDark 
            ? 'hover:bg-white/10' 
            : 'hover:bg-gray-100'
    }`;

    const btnDisabled = `opacity-30 pointer-events-none`;

    const btnActive = `bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand-dark`;

    const btnInactive = isDark ? 'text-white/60' : 'text-gray-600';

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results count */}
            <p className={`text-sm font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Showing <span className={`font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{from.toLocaleString()}-{to.toLocaleString()}</span> of{' '}
                <span className={`font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{totalCount.toLocaleString()}</span> results
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
                {/* First page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
                    title="First page"
                >
                    <ChevronsLeft size={16} />
                </button>

                {/* Previous */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
                    title="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, i) => (
                    page === '...'
                        ? <span key={`dots-${i}`} className={`w-9 h-9 flex items-center justify-center text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>...</span>
                        : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`${btnBase} ${currentPage === page ? btnActive : btnInactive}`}
                            >
                                {page}
                            </button>
                        )
                ))}

                {/* Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
                    title="Next page"
                >
                    <ChevronRight size={16} />
                </button>

                {/* Last page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
                    title="Last page"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default CutoffPagination;
