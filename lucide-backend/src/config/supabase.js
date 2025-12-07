/**
 * Supabase Client Configuration
 * Handles connection to Supabase PostgreSQL database
 */

const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client for user-scoped operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: false, // Backend doesn't persist sessions
            detectSessionInUrl: false
        }
    }
);

// Create Supabase admin client for service-level operations
// This bypasses Row Level Security (RLS) - use with caution!
const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
    : null;

/**
 * Get Supabase client with user authentication context
 * @param {string} accessToken - User's JWT access token
 * @returns {Object} Supabase client scoped to user
 */
function getSupabaseClient(accessToken) {
    if (!accessToken) {
        return supabase;
    }

    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            },
            auth: {
                persistSession: false
            }
        }
    );
}

module.exports = {
    supabase,
    supabaseAdmin,
    getSupabaseClient
};
