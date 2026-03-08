import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Search, Download, Eye, FileText, Filter, X, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const PastPapers = () => {
    const navigate = useNavigate();
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isDark } = useTheme();

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedExam, setSelectedExam] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const papersPerPage = 9;

    // Available filter options (will be populated from data)
    const [years, setYears] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);

    // Fetch papers from Supabase
    useEffect(() => {
        fetchPapers();
    }, []);

    const fetchPapers = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('papers')
                .select('*')
                .order('year', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setPapers(data || []);

            // Extract unique values for filters
            if (data && data.length > 0) {
                const uniqueYears = [...new Set(data.map(p => p.year))].sort((a, b) => b - a);
                const uniqueSubjects = [...new Set(data.map(p => p.subject))].sort();
                const uniqueExamTypes = [...new Set(data.map(p => p.exam_type))].sort();

                setYears(uniqueYears);
                setSubjects(uniqueSubjects);
                setExamTypes(uniqueExamTypes);
            }
        } catch (err) {
            console.error('Error fetching papers:', err);
            setError(err.message || 'Failed to load papers');
        } finally {
            setLoading(false);
        }
    };

    // Filter papers based on search and filters
    const filteredPapers = papers.filter(paper => {
        const matchesSearch =
            paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            paper.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            paper.exam_type.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesYear = selectedYear === 'all' || paper.year === parseInt(selectedYear);
        const matchesSubject = selectedSubject === 'all' || paper.subject === selectedSubject;
        const matchesExam = selectedExam === 'all' || paper.exam_type === selectedExam;

        return matchesSearch && matchesYear && matchesSubject && matchesExam;
    });

    // Pagination
    const indexOfLastPaper = currentPage * papersPerPage;
    const indexOfFirstPaper = indexOfLastPaper - papersPerPage;
    const currentPapers = filteredPapers.slice(indexOfFirstPaper, indexOfLastPaper);
    const totalPages = Math.ceil(filteredPapers.length / papersPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedYear, selectedSubject, selectedExam]);

    const handleDownload = async (paper) => {
        try {
            // Trigger download — works with both Supabase and Google Drive URLs
            const link = document.createElement('a');
            link.href = paper.file_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            if (paper.title) link.download = `${paper.title}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Download error:', err);
            // Fallback to window.open
            try {
                window.open(paper.file_url, '_blank');
            } catch {
                alert('Failed to download paper. Please try again.');
            }
        }
    };

    const handlePreview = (paperId) => {
        navigate(`/study-hub/past-papers/${paperId}`);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedYear('all');
        setSelectedSubject('all');
        setSelectedExam('all');
    };

    const hasActiveFilters =
        selectedYear !== 'all' ||
        selectedSubject !== 'all' ||
        selectedExam !== 'all' ||
        searchQuery !== '';

    if (loading) {
        return (
            <div className="container mx-auto px-6 py-8 pt-32 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto mb-4 text-brand" size={48} />
                    <p className={`font-general ${isDark ? 'text-white/70' : 'text-gray-500'}`}>Loading papers...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-6 py-8 pt-32">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                    <p className="text-red-400 font-general mb-4">❌ {error}</p>
                    <Button onClick={fetchPapers} variant="secondary">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 space-y-8 pt-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2 font-general">
                        <Link to="/study-hub" className={`hover:text-brand text-sm transition-colors ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                            Study Hub
                        </Link>
                        <span className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-300'}`}>/</span>
                        <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Past Papers</span>
                    </div>
                    <h1 className={`text-3xl md:text-4xl font-heading font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Past Year Papers</h1>
                    <p className={`mt-1 font-general max-w-lg ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        Access {papers.length}+ actual question papers from previous years.
                    </p>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex gap-4 flex-wrap">
                <div className="relative flex-grow min-w-[250px]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={20} />
                    <input
                        type="text"
                        placeholder="Search papers by title, subject, exam..."
                        className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-general ${isDark ? 'bg-dark-card border-white/10 text-white placeholder:text-white/30' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={18} />
                    <span className="hidden sm:inline">Filters</span>
                    {hasActiveFilters && (
                        <span className="bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            !
                        </span>
                    )}
                </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <Card className="p-6 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-bold text-lg">Filter Options</h3>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-brand hover:text-brand/80"
                            >
                                <X size={16} className="mr-1" />
                                Clear All
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Year Filter */}
                        <div>
                            <label className={`block text-sm mb-2 font-general ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Year</label>
                            <select
                                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-brand/50 font-general ${isDark ? 'bg-dark-card border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="all">All Years</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Filter */}
                        <div>
                            <label className={`block text-sm mb-2 font-general ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Subject</label>
                            <select
                                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-brand/50 font-general ${isDark ? 'bg-dark-card border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                            >
                                <option value="all">All Subjects</option>
                                {subjects.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        {/* Exam Type Filter */}
                        <div>
                            <label className={`block text-sm mb-2 font-general ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Exam Type</label>
                            <select
                                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-brand/50 font-general ${isDark ? 'bg-dark-card border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                value={selectedExam}
                                onChange={(e) => setSelectedExam(e.target.value)}
                            >
                                <option value="all">All Exams</option>
                                {examTypes.map(exam => (
                                    <option key={exam} value={exam}>{exam}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Card>
            )}

            {/* Results Info */}
            <div className={`flex items-center justify-between text-sm font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                <p>
                    Showing {indexOfFirstPaper + 1}-{Math.min(indexOfLastPaper, filteredPapers.length)} of {filteredPapers.length} papers
                </p>
                {hasActiveFilters && (
                    <p className="text-brand">Filters applied</p>
                )}
            </div>

            {/* Papers Grid */}
            {currentPapers.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className={`mx-auto mb-4 ${isDark ? 'text-white/30' : 'text-gray-300'}`} size={64} />
                    <h3 className={`text-xl font-heading font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No papers found</h3>
                    <p className={`font-general mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {hasActiveFilters
                            ? 'Try adjusting your filters or search query'
                            : 'Papers will appear here once uploaded'}
                    </p>
                    {hasActiveFilters && (
                        <Button onClick={clearFilters} variant="secondary">
                            Clear Filters
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentPapers.map((paper) => (
                        <Card key={paper.id} className="flex flex-col justify-between group hover:border-brand/30 transition-all">
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-brand/10 text-brand">
                                        <FileText size={24} />
                                    </div>
                                    <span className={`text-xs font-general ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{paper.file_size || 'N/A'}</span>
                                </div>

                                <div>
                                    <span className="text-xs font-semibold text-brand/80 mb-1 block font-general uppercase">
                                        {paper.year} • {paper.shift || 'All'}
                                    </span>
                                    <h3 className={`font-bold text-lg leading-tight mb-2 group-hover:text-brand transition-colors font-heading line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {paper.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className={`px-2 py-1 rounded font-general ${isDark ? 'bg-white/5 text-white/70' : 'bg-gray-100 text-gray-600'}`}>
                                            {paper.exam_type}
                                        </span>
                                        <span className="px-2 py-1 rounded bg-brand/10 text-brand font-general">
                                            {paper.subject}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={`flex gap-2 mt-6 pt-4 border-t font-general ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1 text-xs"
                                    onClick={() => handlePreview(paper.id)}
                                >
                                    <Eye size={14} className="mr-2" />
                                    View
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs"
                                    onClick={() => handleDownload(paper)}
                                >
                                    <Download size={14} className="mr-2" />
                                    Download
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>

                    <div className="flex gap-2">
                        {[...Array(totalPages)].map((_, index) => {
                            const page = index + 1;
                            // Show first, last, current, and adjacent pages
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                                return (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? 'primary' : 'secondary'}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className="min-w-[40px]"
                                    >
                                        {page}
                                    </Button>
                                );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                                return <span key={page} className={`px-2 ${isDark ? 'text-white/30' : 'text-gray-300'}`}>...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};

export default PastPapers;