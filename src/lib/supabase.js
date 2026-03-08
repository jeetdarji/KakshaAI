import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Capture native fetch for retry wrapper
const originalFetch = window.fetch.bind(window);

// Retry with exponential backoff (up to 3 attempts)
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function fetchWithRetry(url, options) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await originalFetch(url, options);

            // Detect Supabase quota-exceeded (402) or project-paused (540) responses
            if (response.status === 402) {
                console.error('Supabase quota exceeded (402). Storage or usage limit hit.');
                // Return the response so Supabase client can parse the error body
                return response;
            }
            if (response.status === 540 || response.status === 503) {
                console.warn(`Supabase project unavailable (${response.status}). It may be paused or restoring.`);
                if (attempt < MAX_RETRIES - 1) {
                    const delay = BASE_DELAY * Math.pow(2, attempt);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            }

            return response;
        } catch (err) {
            lastError = err;
            const delay = BASE_DELAY * Math.pow(2, attempt); // 1s, 2s, 4s
            console.warn(`Supabase fetch attempt ${attempt + 1}/${MAX_RETRIES} failed: ${err.message}. Retrying in ${delay}ms…`);
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    console.error('Supabase fetch failed after all retries:', lastError?.message);
    throw lastError;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true
    },
    global: {
        headers: {
            'Accept': 'application/json'
        },
        fetch: fetchWithRetry
    }
});

/**
 * Quick health check — pings the Supabase REST API.
 * Returns true if reachable, false otherwise.
 */
export async function checkSupabaseConnection() {
    try {
        const res = await originalFetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: { apikey: supabaseAnonKey },
        });
        return res.ok || res.status === 404; // 404 is fine, server responded
    } catch {
        return false;
    }
}
