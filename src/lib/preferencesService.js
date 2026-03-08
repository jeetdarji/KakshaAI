import { supabase } from './supabase';

/**
 * Preferences Service — User personalization for the College Cutoff feature
 * 
 * Manages: shortlists, saved searches, and comparison lists
 * Table: user_cutoff_preferences (with RLS — users can only access their own data)
 * 
 * preference_type values:
 *   'shortlist'     — individual college shortlist entries
 *   'saved_search'  — saved filter combinations
 *   'comparison'    — saved comparison sets
 */

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the currently authenticated user ID, or null if not logged in.
 */
async function getCurrentUserId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated. Returns { userId, error }.
 */
export async function requireAuth() {
    const userId = await getCurrentUserId();
    if (!userId) {
        return { userId: null, error: 'Please sign in to use this feature.' };
    }
    return { userId, error: null };
}

// ============================================================================
// COLLEGE SHORTLISTING
// ============================================================================

/**
 * Add a college/cutoff record to the user's shortlist.
 * 
 * @param {Object} collegeData — cutoff record data to save
 * @param {string} collegeData.college_name
 * @param {string} collegeData.course_name
 * @param {number} collegeData.year
 * @param {number} collegeData.cap_round
 * @param {string} collegeData.category
 * @param {number|null} collegeData.cutoff_rank
 * @param {number|null} collegeData.cutoff_percentile
 * @param {string} [collegeData.notes] — optional user notes
 * @returns {{ data, error }}
 */
export async function addToShortlist(collegeData) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { data: null, error: authError };

    try {
        // Generate a unique key so we don't duplicate the same college+course+year+round+category
        const key = `${collegeData.college_name}||${collegeData.course_name}||${collegeData.year}||${collegeData.cap_round}||${collegeData.category}`;

        const payload = {
            user_id: userId,
            preference_type: 'shortlist',
            data: {
                key,
                college_name: collegeData.college_name,
                course_name: collegeData.course_name,
                year: collegeData.year,
                cap_round: collegeData.cap_round,
                category: collegeData.category,
                cutoff_rank: collegeData.cutoff_rank,
                cutoff_percentile: collegeData.cutoff_percentile,
                college_code: collegeData.college_code || null,
                course_code: collegeData.course_code || null,
                city: collegeData.city || null,
                level: collegeData.level || null,
                notes: collegeData.notes || '',
                order: Date.now(), // for ordering
            },
        };

        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .upsert(payload, { onConflict: 'user_id,preference_type,((data->>\'key\'))' })
            .select()
            .single();

        if (error) {
            console.error('addToShortlist error:', error);
            // Fallback: try insert 
            const { data: insertData, error: insertError } = await supabase
                .from('user_cutoff_preferences')
                .insert(payload)
                .select()
                .single();
            
            if (insertError) {
                // Might be duplicate, which is fine
                if (insertError.code === '23505') {
                    return { data: null, error: 'This college is already in your shortlist.' };
                }
                return { data: null, error: insertError.message };
            }
            return { data: insertData, error: null };
        }

        return { data, error: null };
    } catch (err) {
        console.error('addToShortlist exception:', err);
        return { data: null, error: err.message };
    }
}

/**
 * Remove a college from the user's shortlist.
 * @param {string} shortlistId — the UUID of the preference record
 */
export async function removeFromShortlist(shortlistId) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { error: authError };

    try {
        const { error } = await supabase
            .from('user_cutoff_preferences')
            .delete()
            .eq('id', shortlistId)
            .eq('user_id', userId)
            .eq('preference_type', 'shortlist');

        if (error) {
            console.error('removeFromShortlist error:', error);
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        console.error('removeFromShortlist exception:', err);
        return { error: err.message };
    }
}

/**
 * Get all shortlisted colleges for the current user.
 * @returns {{ data: Array, error }}
 */
export async function getShortlist() {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { data: [], error: authError };

    try {
        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .select('*')
            .eq('user_id', userId)
            .eq('preference_type', 'shortlist')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getShortlist error:', error);
            return { data: [], error: error.message };
        }

        return { data: data || [], error: null };
    } catch (err) {
        console.error('getShortlist exception:', err);
        return { data: [], error: err.message };
    }
}

/**
 * Update notes on a shortlisted college.
 * @param {string} shortlistId
 * @param {string} notes
 */
export async function updateShortlistNotes(shortlistId, notes) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { error: authError };

    try {
        // First fetch the current record
        const { data: existing, error: fetchError } = await supabase
            .from('user_cutoff_preferences')
            .select('data')
            .eq('id', shortlistId)
            .eq('user_id', userId)
            .single();

        if (fetchError) return { error: fetchError.message };

        // Update the notes in JSONB data
        const updatedData = { ...existing.data, notes };

        const { error } = await supabase
            .from('user_cutoff_preferences')
            .update({ data: updatedData, updated_at: new Date().toISOString() })
            .eq('id', shortlistId)
            .eq('user_id', userId);

        if (error) {
            console.error('updateShortlistNotes error:', error);
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Check whether specific college records are in the user's shortlist.
 * Returns a Set of shortlist keys for fast lookup.
 * @returns {Map<string, string>} — Map of key → shortlist record id
 */
export async function getShortlistKeys() {
    const { userId, error: authError } = await requireAuth();
    if (authError) return new Map();

    try {
        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .select('id, data')
            .eq('user_id', userId)
            .eq('preference_type', 'shortlist');

        if (error || !data) return new Map();

        const map = new Map();
        data.forEach(item => {
            if (item.data?.key) {
                map.set(item.data.key, item.id);
            }
        });
        return map;
    } catch {
        return new Map();
    }
}

/**
 * Build a shortlist key from a cutoff record (for lookup matching)
 */
export function buildShortlistKey(record) {
    return `${record.college_name}||${record.course_name}||${record.year}||${record.cap_round}||${record.category}`;
}

// ============================================================================
// SAVED SEARCHES
// ============================================================================

/**
 * Save the current filter combination.
 * @param {string} name — user-given name for this search
 * @param {Object} filters — the filter state to save
 */
export async function saveSearch(name, filters) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { data: null, error: authError };

    try {
        const key = `search_${Date.now()}`;

        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .insert({
                user_id: userId,
                preference_type: 'saved_search',
                data: {
                    key,
                    name,
                    filters,
                    created_at: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (error) {
            console.error('saveSearch error:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err.message };
    }
}

/**
 * Get all saved searches for the current user.
 */
export async function getSavedSearches() {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { data: [], error: authError };

    try {
        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .select('*')
            .eq('user_id', userId)
            .eq('preference_type', 'saved_search')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getSavedSearches error:', error);
            return { data: [], error: error.message };
        }

        return { data: data || [], error: null };
    } catch (err) {
        return { data: [], error: err.message };
    }
}

/**
 * Delete a saved search.
 * @param {string} searchId
 */
export async function deleteSavedSearch(searchId) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { error: authError };

    try {
        const { error } = await supabase
            .from('user_cutoff_preferences')
            .delete()
            .eq('id', searchId)
            .eq('user_id', userId)
            .eq('preference_type', 'saved_search');

        if (error) {
            console.error('deleteSavedSearch error:', error);
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Apply a saved search — returns the saved filters.
 * @param {string} searchId
 */
export async function applySavedSearch(searchId) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { filters: null, error: authError };

    try {
        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .select('data')
            .eq('id', searchId)
            .eq('user_id', userId)
            .single();

        if (error) return { filters: null, error: error.message };

        return { filters: data?.data?.filters || null, error: null };
    } catch (err) {
        return { filters: null, error: err.message };
    }
}

// ============================================================================
// COMPARISON LISTS
// ============================================================================

/**
 * Save a set of colleges for comparison.
 * @param {string} name — name for this comparison
 * @param {Array} colleges — array of cutoff records to compare
 */
export async function saveComparison(name, colleges) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { data: null, error: authError };

    try {
        const key = `comparison_${Date.now()}`;

        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .insert({
                user_id: userId,
                preference_type: 'comparison',
                data: {
                    key,
                    name,
                    colleges,
                    created_at: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (error) {
            console.error('saveComparison error:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err.message };
    }
}

/**
 * Get all saved comparisons for the current user.
 */
export async function getComparisons() {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { data: [], error: authError };

    try {
        const { data, error } = await supabase
            .from('user_cutoff_preferences')
            .select('*')
            .eq('user_id', userId)
            .eq('preference_type', 'comparison')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getComparisons error:', error);
            return { data: [], error: error.message };
        }

        return { data: data || [], error: null };
    } catch (err) {
        return { data: [], error: err.message };
    }
}

/**
 * Delete a saved comparison.
 * @param {string} comparisonId
 */
export async function deleteComparison(comparisonId) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return { error: authError };

    try {
        const { error } = await supabase
            .from('user_cutoff_preferences')
            .delete()
            .eq('id', comparisonId)
            .eq('user_id', userId)
            .eq('preference_type', 'comparison');

        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: err.message };
    }
}

// ============================================================================
// AUTH STATE LISTENER (for UI reactivity)
// ============================================================================

/**
 * Subscribe to auth state changes.
 * Returns a function to unsubscribe.
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            callback(session?.user || null);
        }
    );
    return () => subscription?.unsubscribe();
}

/**
 * Get the current user (sync, from Supabase session cache).
 */
export async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}
