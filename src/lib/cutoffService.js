import { supabase } from './supabase';

/**
 * Cutoff Service — Database queries for the College Cutoff feature
 * 
 * Tables used:
 *   cutoffs                  — main cutoff data (~287K rows)
 *   user_cutoff_preferences  — saved searches, shortlists, comparisons
 */

// ============================================================================
// MODULE-LEVEL CACHE for filter options (fetched once, reused)
// ============================================================================
let _filterOptionsCache = null;

// ============================================================================
// CATEGORY CODE → HUMAN-READABLE LABEL MAPPING
// ============================================================================

const CATEGORY_MAP = {
    // General (State Level)
    'GOPENS': { label: 'General (Open) - State', group: 'General', short: 'Open - State' },
    'GOPENH': { label: 'General (Open) - Home University', group: 'General', short: 'Open - HU' },
    'GOPENO': { label: 'General (Open) - Other University', group: 'General', short: 'Open - Other' },
    // OBC
    'GOBCS': { label: 'OBC - State', group: 'OBC', short: 'OBC - State' },
    'GOBCH': { label: 'OBC - Home University', group: 'OBC', short: 'OBC - HU' },
    'GOBCO': { label: 'OBC - Other University', group: 'OBC', short: 'OBC - Other' },
    // SC
    'GSCS': { label: 'SC - State', group: 'SC', short: 'SC - State' },
    'GSCH': { label: 'SC - Home University', group: 'SC', short: 'SC - HU' },
    'GSCO': { label: 'SC - Other University', group: 'SC', short: 'SC - Other' },
    // ST
    'GSTS': { label: 'ST - State', group: 'ST', short: 'ST - State' },
    'GSTH': { label: 'ST - Home University', group: 'ST', short: 'ST - HU' },
    'GSTO': { label: 'ST - Other University', group: 'ST', short: 'ST - Other' },
    // VJ/NT
    'GVJS': { label: 'VJ/NT - State', group: 'VJ/NT', short: 'VJ - State' },
    'GVJH': { label: 'VJ/NT - Home University', group: 'VJ/NT', short: 'VJ - HU' },
    'GVJO': { label: 'VJ/NT - Other University', group: 'VJ/NT', short: 'VJ - Other' },
    // SEBC
    'GSEBCS': { label: 'SEBC - State', group: 'SEBC', short: 'SEBC - State' },
    'GSEBCH': { label: 'SEBC - Home University', group: 'SEBC', short: 'SEBC - HU' },
    'GSEBCO': { label: 'SEBC - Other University', group: 'SEBC', short: 'SEBC - Other' },
    // NT1
    'GNT1S': { label: 'NT1 - State', group: 'NT', short: 'NT1 - State' },
    'GNT1H': { label: 'NT1 - Home University', group: 'NT', short: 'NT1 - HU' },
    'GNT1O': { label: 'NT1 - Other University', group: 'NT', short: 'NT1 - Other' },
    // NT2
    'GNT2S': { label: 'NT2 - State', group: 'NT', short: 'NT2 - State' },
    'GNT2H': { label: 'NT2 - Home University', group: 'NT', short: 'NT2 - HU' },
    'GNT2O': { label: 'NT2 - Other University', group: 'NT', short: 'NT2 - Other' },
    // NT3
    'GNT3S': { label: 'NT3 - State', group: 'NT', short: 'NT3 - State' },
    'GNT3H': { label: 'NT3 - Home University', group: 'NT', short: 'NT3 - HU' },
    'GNT3O': { label: 'NT3 - Other University', group: 'NT', short: 'NT3 - Other' },
    // Linguistic Minority
    'LOPENS': { label: 'Linguistic Min. (Open) - State', group: 'Linguistic Minority', short: 'LM Open - State' },
    'LOPENH': { label: 'Linguistic Min. (Open) - Home University', group: 'Linguistic Minority', short: 'LM Open - HU' },
    'LOPENO': { label: 'Linguistic Min. (Open) - Other University', group: 'Linguistic Minority', short: 'LM Open - Other' },
    'LOBCS': { label: 'Linguistic Min. (OBC) - State', group: 'Linguistic Minority', short: 'LM OBC - State' },
    'LOBCH': { label: 'Linguistic Min. (OBC) - Home University', group: 'Linguistic Minority', short: 'LM OBC - HU' },
    'LOBCO': { label: 'Linguistic Min. (OBC) - Other University', group: 'Linguistic Minority', short: 'LM OBC - Other' },
    'LSCS': { label: 'Linguistic Min. (SC) - State', group: 'Linguistic Minority', short: 'LM SC - State' },
    'LSCH': { label: 'Linguistic Min. (SC) - Home University', group: 'Linguistic Minority', short: 'LM SC - HU' },
    'LSCO': { label: 'Linguistic Min. (SC) - Other University', group: 'Linguistic Minority', short: 'LM SC - Other' },
    'LSTS': { label: 'Linguistic Min. (ST) - State', group: 'Linguistic Minority', short: 'LM ST - State' },
    'LSTH': { label: 'Linguistic Min. (ST) - Home University', group: 'Linguistic Minority', short: 'LM ST - HU' },
    'LSTO': { label: 'Linguistic Min. (ST) - Other University', group: 'Linguistic Minority', short: 'LM ST - Other' },
    'LVJS': { label: 'Linguistic Min. (VJ) - State', group: 'Linguistic Minority', short: 'LM VJ - State' },
    'LVJH': { label: 'Linguistic Min. (VJ) - Home University', group: 'Linguistic Minority', short: 'LM VJ - HU' },
    'LVJO': { label: 'Linguistic Min. (VJ) - Other University', group: 'Linguistic Minority', short: 'LM VJ - Other' },
    'LSEBCS': { label: 'Linguistic Min. (SEBC) - State', group: 'Linguistic Minority', short: 'LM SEBC - State' },
    'LSEBCH': { label: 'Linguistic Min. (SEBC) - Home University', group: 'Linguistic Minority', short: 'LM SEBC - HU' },
    'LSEBCO': { label: 'Linguistic Min. (SEBC) - Other University', group: 'Linguistic Minority', short: 'LM SEBC - Other' },
    'LNT1S': { label: 'Linguistic Min. (NT1) - State', group: 'Linguistic Minority', short: 'LM NT1 - State' },
    'LNT1H': { label: 'Linguistic Min. (NT1) - Home University', group: 'Linguistic Minority', short: 'LM NT1 - HU' },
    'LNT1O': { label: 'Linguistic Min. (NT1) - Other University', group: 'Linguistic Minority', short: 'LM NT1 - Other' },
    'LNT2S': { label: 'Linguistic Min. (NT2) - State', group: 'Linguistic Minority', short: 'LM NT2 - State' },
    'LNT2H': { label: 'Linguistic Min. (NT2) - Home University', group: 'Linguistic Minority', short: 'LM NT2 - HU' },
    'LNT2O': { label: 'Linguistic Min. (NT2) - Other University', group: 'Linguistic Minority', short: 'LM NT2 - Other' },
    'LNT3S': { label: 'Linguistic Min. (NT3) - State', group: 'Linguistic Minority', short: 'LM NT3 - State' },
    'LNT3H': { label: 'Linguistic Min. (NT3) - Home University', group: 'Linguistic Minority', short: 'LM NT3 - HU' },
    'LNT3O': { label: 'Linguistic Min. (NT3) - Other University', group: 'Linguistic Minority', short: 'LM NT3 - Other' },
    // Special Categories
    'TFWS': { label: 'Tuition Fee Waiver Scheme', group: 'Special', short: 'TFWS' },
    'EWS': { label: 'Economically Weaker Section', group: 'Special', short: 'EWS' },
    'MI': { label: 'Minority Institute', group: 'Special', short: 'MI' },
    'ORPHAN': { label: 'Orphan', group: 'Special', short: 'Orphan' },
    // Defence
    'DEFOPENS': { label: 'Defence (Open) - State', group: 'Defence', short: 'DEF Open' },
    'DEFOBCS': { label: 'Defence (OBC) - State', group: 'Defence', short: 'DEF OBC' },
    'DEFSCS': { label: 'Defence (SC) - State', group: 'Defence', short: 'DEF SC' },
    'DEFSTS': { label: 'Defence (ST) - State', group: 'Defence', short: 'DEF ST' },
    'DEFSEBCS': { label: 'Defence (SEBC) - State', group: 'Defence', short: 'DEF SEBC' },
    'DEFROBCS': { label: 'Defence Reserved (OBC)', group: 'Defence', short: 'DEFR OBC' },
    'DEFRSCS': { label: 'Defence Reserved (SC)', group: 'Defence', short: 'DEFR SC' },
    'DEFRSTS': { label: 'Defence Reserved (ST)', group: 'Defence', short: 'DEFR ST' },
    'DEFRVJS': { label: 'Defence Reserved (VJ)', group: 'Defence', short: 'DEFR VJ' },
    'DEFRSEBC S': { label: 'Defence Reserved (SEBC)', group: 'Defence', short: 'DEFR SEBC' },
    'DEFRNT1S': { label: 'Defence Reserved (NT1)', group: 'Defence', short: 'DEFR NT1' },
    'DEFRNT2S': { label: 'Defence Reserved (NT2)', group: 'Defence', short: 'DEFR NT2' },
    'DEFRNT3S': { label: 'Defence Reserved (NT3)', group: 'Defence', short: 'DEFR NT3' },
    // PWD
    'PWDOPENS': { label: 'PWD (Open) - State', group: 'PWD', short: 'PWD Open' },
    'PWDOPENH': { label: 'PWD (Open) - Home University', group: 'PWD', short: 'PWD Open HU' },
    'PWDOBCS': { label: 'PWD (OBC) - State', group: 'PWD', short: 'PWD OBC' },
    'PWDOBCH': { label: 'PWD (OBC) - Home University', group: 'PWD', short: 'PWD OBC HU' },
    'PWDSCS': { label: 'PWD (SC) - State', group: 'PWD', short: 'PWD SC' },
    'PWDSTS': { label: 'PWD (ST) - State', group: 'PWD', short: 'PWD ST' },
    'PWDSEBCS': { label: 'PWD (SEBC) - State', group: 'PWD', short: 'PWD SEBC' },
    'PWDRNT1S': { label: 'PWD Reserved (NT1)', group: 'PWD', short: 'PWDR NT1' },
    'PWDRNT2S': { label: 'PWD Reserved (NT2)', group: 'PWD', short: 'PWDR NT2' },
    'PWDRNT3S': { label: 'PWD Reserved (NT3)', group: 'PWD', short: 'PWDR NT3' },
    'PWDROBC H': { label: 'PWD Reserved (OBC) HU', group: 'PWD', short: 'PWDR OBC HU' },
    'PWDROBC S': { label: 'PWD Reserved (OBC) State', group: 'PWD', short: 'PWDR OBC' },
    'PWDRSCH': { label: 'PWD Reserved (SC) HU', group: 'PWD', short: 'PWDR SC HU' },
    'PWDRSCS': { label: 'PWD Reserved (SC) State', group: 'PWD', short: 'PWDR SC' },
    'PWDRSEBC S': { label: 'PWD Reserved (SEBC)', group: 'PWD', short: 'PWDR SEBC' },
    'PWDRSTS': { label: 'PWD Reserved (ST)', group: 'PWD', short: 'PWDR ST' },
    'PWDRVJS': { label: 'PWD Reserved (VJ)', group: 'PWD', short: 'PWDR VJ' },
};

// Category groups for the grouped dropdown UI
const CATEGORY_GROUPS = [
    { group: 'General', label: 'General' },
    { group: 'OBC', label: 'OBC' },
    { group: 'SC', label: 'SC' },
    { group: 'ST', label: 'ST' },
    { group: 'VJ/NT', label: 'VJ/NT (Vimukta Jati)' },
    { group: 'SEBC', label: 'SEBC' },
    { group: 'NT', label: 'NT (Nomadic Tribes)' },
    { group: 'Special', label: 'Special Categories' },
    { group: 'Defence', label: 'Defence' },
    { group: 'PWD', label: 'Persons with Disabilities' },
    { group: 'Linguistic Minority', label: 'Linguistic Minority' },
];

/**
 * Get a human-readable label for a category code
 */
export function getCategoryLabel(code) {
    return CATEGORY_MAP[code]?.label || code;
}

/**
 * Get the short label for a category code (for table display)
 */
export function getCategoryShort(code) {
    return CATEGORY_MAP[code]?.short || code;
}

/**
 * Get category group for a code
 */
export function getCategoryGroup(code) {
    return CATEGORY_MAP[code]?.group || 'Other';
}

/**
 * Get the full category map (for dropdowns)
 */
export function getPopularCategories() {
    return CATEGORY_MAP;
}

/**
 * Get category groups for grouped dropdown
 */
export function getCategoryGroups() {
    return CATEGORY_GROUPS;
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================

/**
 * Search cutoffs with multiple filters and pagination.
 * 
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.collegeName] - Partial match on college name
 * @param {string} [filters.courseName] - Exact match on course/branch name
 * @param {number} [filters.year] - Year filter (2023-2025)
 * @param {number} [filters.capRound] - CAP round (1-4)
 * @param {string} [filters.category] - Category code (e.g., 'GOPENS')
 * @param {string} [filters.level] - Level filter
 * @param {number} [filters.minRank] - Minimum cutoff rank
 * @param {number} [filters.maxRank] - Maximum cutoff rank
 * @param {string} [filters.sortBy] - Sort column (default: 'cutoff_rank')
 * @param {string} [filters.sortOrder] - 'asc' or 'desc' (default: 'asc')
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Results per page (default: 50)
 * @returns {{ data: Array, count: number, error: Object|null }}
 */
export async function searchCutoffs(filters = {}, page = 1, pageSize = 50) {
    try {
        let query = supabase
            .from('cutoffs')
            .select('*', { count: 'exact' });

        // Apply filters dynamically
        if (filters.collegeName) {
            query = query.ilike('college_name', `%${filters.collegeName}%`);
        }
        if (filters.courseName) {
            query = query.eq('course_name', filters.courseName);
        }
        if (filters.year) {
            query = query.eq('year', filters.year);
        }
        if (filters.capRound) {
            query = query.eq('cap_round', filters.capRound);
        }
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.level) {
            query = query.eq('level', filters.level);
        }
        if (filters.city) {
            query = query.eq('city', filters.city);
        }
        if (filters.minRank != null) {
            query = query.gte('cutoff_rank', filters.minRank);
        }
        if (filters.maxRank != null) {
            query = query.lte('cutoff_rank', filters.maxRank);
        }

        // Sorting
        const sortBy = filters.sortBy || 'cutoff_rank';
        const ascending = filters.sortOrder !== 'desc';
        query = query.order(sortBy, { ascending, nullsFirst: false });

        // Pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) {
            console.error('searchCutoffs error:', error);
            return { data: [], count: 0, error };
        }

        return { data: data || [], count: count || 0, error: null };
    } catch (err) {
        console.error('searchCutoffs exception:', err);
        return { data: [], count: 0, error: err };
    }
}

// ============================================================================
// FILTER OPTIONS (cached)
// ============================================================================

/**
 * Fetch distinct values for all filter dropdowns.
 * Uses a PostgreSQL RPC function to get all distinct values in a single call.
 * Results are cached after the first call.
 */
export async function getFilterOptions() {
    if (_filterOptionsCache) return _filterOptionsCache;

    // Try RPC first, then fall back to direct queries
    let result = null;

    // --- Attempt 1: RPC function (fastest, single round-trip) ---
    try {
        const { data, error } = await supabase.rpc('get_cutoff_filter_options');

        if (!error && data) {
            result = {
                colleges: data.colleges || [],
                courses: data.courses || [],
                categories: data.categories || [],
                years: data.years || [],
                capRounds: data.capRounds || data.caprounds || [],
                levels: data.levels || [],
                cities: data.cities || [],
            };
        } else {
            console.warn('getFilterOptions RPC failed, falling back to direct queries:', error?.message);
        }
    } catch (rpcErr) {
        console.warn('getFilterOptions RPC exception, falling back to direct queries:', rpcErr.message);
    }

    // --- Attempt 2: Direct table queries (fallback) ---
    if (!result) {
        try {
            const [yearsRes, roundsRes, categoriesRes, levelsRes] = await Promise.all([
                supabase.from('cutoffs').select('year').limit(1000),
                supabase.from('cutoffs').select('cap_round').limit(1000),
                supabase.from('cutoffs').select('category').limit(1000),
                supabase.from('cutoffs').select('level').limit(1000),
            ]);

            const unique = (arr, key) => [...new Set((arr || []).map(r => r[key]).filter(Boolean))].sort();

            result = {
                colleges: [],  // too many to fetch without RPC; user types to search
                courses: [],
                categories: unique(categoriesRes.data, 'category'),
                years: unique(yearsRes.data, 'year').sort((a, b) => b - a),
                capRounds: unique(roundsRes.data, 'cap_round').sort((a, b) => a - b),
                levels: unique(levelsRes.data, 'level'),
                cities: [],
            };
        } catch (directErr) {
            console.error('getFilterOptions direct queries also failed:', directErr.message);
        }
    }

    // --- Attempt 3: Hard-coded fallback so the UI isn't broken ---
    if (!result) {
        result = {
            colleges: [], courses: [], categories: [],
            years: [2025, 2024, 2023],
            capRounds: [1, 2, 3, 4],
            levels: [],
            cities: [],
        };
    }

    _filterOptionsCache = result;
    return _filterOptionsCache;
}

/**
 * Clear the cached filter options (useful after data updates)
 */
export function clearFilterOptionsCache() {
    _filterOptionsCache = null;
}

/**
 * Fetch distinct courses and categories for a specific college.
 * Used to auto-filter Branch/Category dropdowns when a college is selected.
 * @param {string} collegeName - Exact college name
 * @returns {{ courses: string[], categories: string[] }}
 */
export async function getCollegeFilterOptions(collegeName) {
    if (!collegeName) return { courses: [], categories: [] };

    try {
        const { data, error } = await supabase
            .from('cutoffs')
            .select('course_name, category')
            .eq('college_name', collegeName);

        if (error) {
            console.error('getCollegeFilterOptions error:', error);
            return { courses: [], categories: [] };
        }

        const courses = [...new Set((data || []).map(r => r.course_name).filter(Boolean))].sort();
        const categories = [...new Set((data || []).map(r => r.category).filter(Boolean))].sort();

        return { courses, categories };
    } catch (err) {
        console.error('getCollegeFilterOptions exception:', err);
        return { courses: [], categories: [] };
    }
}

// ============================================================================
// RANK PREDICTOR
// ============================================================================

/**
 * Find colleges where the user's rank qualifies.
 * Lower rank = better. If cutoff is 5000 and user rank is 3000, they qualify.
 * 
 * @param {number} rank - User's MHT-CET rank
 * @param {string} category - Category code (e.g., 'GOPENS')
 * @param {string} [courseName] - Optional branch filter
 * @param {number} [year] - Year to check (default: latest)
 * @param {number} [capRound] - CAP round (default: 1)
 * @returns {{ data: Array, count: number, error: Object|null }}
 */
export async function getCollegesForRank(rank, category, courseName = null, year = 2025, capRound = 1, city = null) {
    try {
        let query = supabase
            .from('cutoffs')
            .select('*', { count: 'exact' })
            .gte('cutoff_rank', rank) // cutoff rank >= user rank means they qualify
            .eq('category', category)
            .eq('year', year)
            .eq('cap_round', capRound)
            .order('cutoff_rank', { ascending: true });

        if (courseName) {
            query = query.eq('course_name', courseName);
        }
        if (city) {
            query = query.eq('city', city);
        }

        // Limit to a reasonable number
        query = query.limit(200);

        const { data, count, error } = await query;

        if (error) {
            console.error('getCollegesForRank error:', error);
            return { data: [], count: 0, error };
        }

        // Deduplicate by college_name + course_name (keep the one with best cutoff_rank)
        const seen = new Map();
        for (const row of (data || [])) {
            const key = `${row.college_name}||${row.course_name}`;
            if (!seen.has(key) || (row.cutoff_rank && row.cutoff_rank > (seen.get(key).cutoff_rank || 0))) {
                seen.set(key, row);
            }
        }
        const unique = Array.from(seen.values());

        // Add safety classification
        const classified = unique.map(record => {
            const ratio = rank / record.cutoff_rank;
            let safety;
            if (ratio <= 0.7) safety = 'safe';        // rank is ≤70% of cutoff
            else if (ratio <= 0.9) safety = 'moderate'; // 70-90%
            else safety = 'reach';                      // 90-100%

            return {
                ...record,
                safety,
                rankDifference: record.cutoff_rank - rank,
            };
        });

        return { data: classified, count: classified.length, error: null };
    } catch (err) {
        console.error('getCollegesForRank exception:', err);
        return { data: [], count: 0, error: err };
    }
}

/**
 * Fallback: Find nearby colleges when no exact matches are found
 */
export async function getNearbyColleges(rank, category, courseName = null, year = 2025, range = 2000, city = null, capRound = 1) {
    try {
        let query = supabase
            .from('cutoffs')
            .select('*')
            .eq('category', category)
            .eq('year', year)
            .eq('cap_round', capRound)
            .gte('cutoff_rank', rank - range)
            .lte('cutoff_rank', rank + range)
            .order('cutoff_rank', { ascending: true })
            .limit(50);

        if (courseName) {
            query = query.eq('course_name', courseName);
        }
        if (city) {
            query = query.eq('city', city);
        }

        const { data, error } = await query;

        if (error) return { data: [], error };

        // Deduplicate by college_name + course_name
        const seen = new Map();
        for (const row of (data || [])) {
            const key = `${row.college_name}||${row.course_name}`;
            if (!seen.has(key)) seen.set(key, row);
        }

        return { data: Array.from(seen.values()), error: null };
    } catch (err) {
        return { data: [], error: err };
    }
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Get cutoff trend data for a specific college + course + category across years.
 */
export async function getCutoffTrends(collegeName, courseName, category = 'GOPENS') {
    try {
        const { data, error } = await supabase
            .from('cutoffs')
            .select('year, cap_round, cutoff_rank, cutoff_percentile, college_name, course_name')
            .ilike('college_name', `%${collegeName}%`)
            .eq('course_name', courseName)
            .eq('category', category)
            .order('year', { ascending: true })
            .order('cap_round', { ascending: true })
            .limit(100);

        if (error) {
            console.error('getCutoffTrends error:', error);
            return { data: [], error };
        }

        return { data: data || [], error: null };
    } catch (err) {
        console.error('getCutoffTrends exception:', err);
        return { data: [], error: err };
    }
}

/**
 * Calculate trend insight text
 */
export function getTrendInsight(trendData) {
    if (!trendData || trendData.length < 2) return null;

    // Filter to CAP Round 1 for meaningful comparison
    const r1Data = trendData.filter(d => d.cap_round === 1);
    if (r1Data.length < 2) return null;

    const newest = r1Data[r1Data.length - 1];
    const oldest = r1Data[0];

    if (!newest.cutoff_rank || !oldest.cutoff_rank) return null;

    const change = ((newest.cutoff_rank - oldest.cutoff_rank) / oldest.cutoff_rank) * 100;
    const years = newest.year - oldest.year;

    if (Math.abs(change) < 5) {
        return { text: `Cutoff has remained relatively stable over ${years} years`, trend: 'stable' };
    } else if (change < 0) {
        return { text: `Cutoff rank decreased by ${Math.abs(change).toFixed(0)}% over ${years} years (getting harder)`, trend: 'harder' };
    } else {
        return { text: `Cutoff rank increased by ${change.toFixed(0)}% over ${years} years (getting easier)`, trend: 'easier' };
    }
}
