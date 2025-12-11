/**
 * User Context Service - Phase WOW 1 Jour 5
 *
 * Manages user context information for enhanced prompt engineering:
 * - Industry/domain
 * - Job role
 * - Company size
 * - Experience level
 * - Current challenges
 *
 * This context is used to personalize AI responses and make them more relevant.
 */

const sqliteClient = require('./sqliteClient');

class UserContextService {
    constructor() {
        this.tableName = 'user_context';
        this.initialized = false;
    }

    /**
     * Initialize the user_context table
     */
    init() {
        if (this.initialized) return;

        try {
            const db = sqliteClient.getDb();

            // Create user_context table if it doesn't exist
            db.exec(`
                CREATE TABLE IF NOT EXISTS user_context (
                    uid TEXT PRIMARY KEY,

                    -- Industry & Domain
                    industry TEXT,                    -- "SaaS", "E-commerce", "Fintech", etc.
                    industry_sub TEXT,                -- "B2B SaaS", "B2C Marketplace", etc.

                    -- Company Info
                    company_size TEXT,                -- "1-10", "11-50", "51-200", "201-500", "500+"
                    company_stage TEXT,               -- "Pre-seed", "Seed", "Series A", "Series B+", "Profitable"
                    company_type TEXT,                -- "Startup", "Scale-up", "Corporate", "Agency", "Freelance"

                    -- User Role
                    job_role TEXT,                    -- "CEO", "CTO", "VP Sales", "Manager", "Individual Contributor"
                    job_function TEXT,                -- "Executive", "Engineering", "Sales", "Marketing", "HR", "Operations"
                    seniority TEXT,                   -- "Junior", "Mid-level", "Senior", "Lead", "Executive"

                    -- Experience
                    experience_years INTEGER,         -- Years of professional experience
                    is_first_time_founder INTEGER DEFAULT 0,  -- Boolean for founders
                    has_managed_team INTEGER DEFAULT 0,       -- Boolean
                    team_size INTEGER,                -- Number of direct reports

                    -- Current Focus & Challenges
                    current_challenges TEXT,          -- JSON array: ["fundraising", "hiring", "product-market fit"]
                    current_goals TEXT,               -- JSON array: ["grow ARR", "hire CTO", "expand EMEA"]
                    preferred_frameworks TEXT,        -- JSON array: ["OKR", "SMART", "EOS"]

                    -- Communication Preferences
                    preferred_tone TEXT DEFAULT 'balanced',  -- "formal", "casual", "balanced"
                    preferred_format TEXT DEFAULT 'structured', -- "structured", "conversational", "bullet_points"
                    technical_level TEXT DEFAULT 'intermediate', -- "beginner", "intermediate", "advanced", "expert"

                    -- Onboarding
                    onboarding_completed INTEGER DEFAULT 0,
                    onboarding_completed_at INTEGER,
                    onboarding_skipped INTEGER DEFAULT 0,

                    -- Metadata
                    created_at INTEGER,
                    updated_at INTEGER,

                    -- Optional: Specific domain knowledge
                    domain_knowledge TEXT             -- JSON object with specific domain info
                )
            `);

            console.log('[UserContextService] Table created or already exists');
            this.initialized = true;
        } catch (error) {
            console.error('[UserContextService] Error initializing table:', error);
            throw error;
        }
    }

    /**
     * Get user context
     * @param {string} uid - User ID
     * @returns {Object|null} User context or null if not found
     */
    getContext(uid = 'default_user') {
        this.init();

        try {
            const db = sqliteClient.getDb();
            const stmt = db.prepare('SELECT * FROM user_context WHERE uid = ?');
            const context = stmt.get(uid);

            if (context) {
                // Parse JSON fields
                if (context.current_challenges) {
                    try {
                        context.current_challenges = JSON.parse(context.current_challenges);
                    } catch (e) {
                        context.current_challenges = [];
                    }
                }

                if (context.current_goals) {
                    try {
                        context.current_goals = JSON.parse(context.current_goals);
                    } catch (e) {
                        context.current_goals = [];
                    }
                }

                if (context.preferred_frameworks) {
                    try {
                        context.preferred_frameworks = JSON.parse(context.preferred_frameworks);
                    } catch (e) {
                        context.preferred_frameworks = [];
                    }
                }

                if (context.domain_knowledge) {
                    try {
                        context.domain_knowledge = JSON.parse(context.domain_knowledge);
                    } catch (e) {
                        context.domain_knowledge = {};
                    }
                }
            }

            return context;
        } catch (error) {
            console.error('[UserContextService] Error getting context:', error);
            return null;
        }
    }

    /**
     * Save or update user context
     * @param {string} uid - User ID
     * @param {Object} context - Context data
     * @returns {boolean} Success
     */
    saveContext(uid = 'default_user', context) {
        this.init();

        try {
            const db = sqliteClient.getDb();
            const now = Date.now();

            // Stringify JSON fields
            const contextToSave = { ...context };
            if (Array.isArray(contextToSave.current_challenges)) {
                contextToSave.current_challenges = JSON.stringify(contextToSave.current_challenges);
            }
            if (Array.isArray(contextToSave.current_goals)) {
                contextToSave.current_goals = JSON.stringify(contextToSave.current_goals);
            }
            if (Array.isArray(contextToSave.preferred_frameworks)) {
                contextToSave.preferred_frameworks = JSON.stringify(contextToSave.preferred_frameworks);
            }
            if (typeof contextToSave.domain_knowledge === 'object') {
                contextToSave.domain_knowledge = JSON.stringify(contextToSave.domain_knowledge);
            }

            // Check if context exists
            const existing = db.prepare('SELECT uid FROM user_context WHERE uid = ?').get(uid);

            if (existing) {
                // Update
                const fields = Object.keys(contextToSave)
                    .filter(key => key !== 'uid' && key !== 'created_at')
                    .map(key => `${key} = @${key}`)
                    .join(', ');

                const stmt = db.prepare(`
                    UPDATE user_context
                    SET ${fields}, updated_at = @updated_at
                    WHERE uid = @uid
                `);

                stmt.run({
                    ...contextToSave,
                    uid,
                    updated_at: now
                });
            } else {
                // Insert
                const fields = ['uid', 'created_at', 'updated_at', ...Object.keys(contextToSave)];
                const placeholders = fields.map(f => `@${f}`).join(', ');

                const stmt = db.prepare(`
                    INSERT INTO user_context (${fields.join(', ')})
                    VALUES (${placeholders})
                `);

                stmt.run({
                    ...contextToSave,
                    uid,
                    created_at: now,
                    updated_at: now
                });
            }

            console.log('[UserContextService] Context saved for uid:', uid);
            return true;
        } catch (error) {
            console.error('[UserContextService] Error saving context:', error);
            return false;
        }
    }

    /**
     * Update specific fields of user context
     * @param {string} uid - User ID
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success
     */
    updateContext(uid = 'default_user', updates) {
        const existing = this.getContext(uid);
        if (!existing) {
            // Create new context with updates
            return this.saveContext(uid, updates);
        }

        // Merge updates with existing
        const merged = { ...existing, ...updates };
        return this.saveContext(uid, merged);
    }

    /**
     * Mark onboarding as completed
     * @param {string} uid - User ID
     * @returns {boolean} Success
     */
    completeOnboarding(uid = 'default_user') {
        return this.updateContext(uid, {
            onboarding_completed: 1,
            onboarding_completed_at: Date.now(),
            onboarding_skipped: 0
        });
    }

    /**
     * Skip onboarding
     * @param {string} uid - User ID
     * @returns {boolean} Success
     */
    skipOnboarding(uid = 'default_user') {
        return this.updateContext(uid, {
            onboarding_skipped: 1,
            onboarding_completed: 0
        });
    }

    /**
     * Check if user has completed onboarding
     * @param {string} uid - User ID
     * @returns {boolean} Has completed onboarding
     */
    hasCompletedOnboarding(uid = 'default_user') {
        const context = this.getContext(uid);
        return context ? context.onboarding_completed === 1 : false;
    }

    /**
     * Get a human-readable summary of user context
     * @param {string} uid - User ID
     * @returns {string} Context summary
     */
    getContextSummary(uid = 'default_user') {
        const ctx = this.getContext(uid);
        if (!ctx) return 'No context available';

        const parts = [];

        if (ctx.job_role) parts.push(`${ctx.job_role}`);
        if (ctx.industry) parts.push(`in ${ctx.industry}`);
        if (ctx.company_size) parts.push(`(${ctx.company_size} employees)`);
        if (ctx.company_stage) parts.push(`at ${ctx.company_stage} stage`);
        if (ctx.experience_years) parts.push(`with ${ctx.experience_years}+ years experience`);

        return parts.join(' ') || 'Limited context available';
    }

    /**
     * Reset user context (useful for testing)
     * @param {string} uid - User ID
     * @returns {boolean} Success
     */
    resetContext(uid = 'default_user') {
        this.init();

        try {
            const db = sqliteClient.getDb();
            const stmt = db.prepare('DELETE FROM user_context WHERE uid = ?');
            stmt.run(uid);

            console.log('[UserContextService] Context reset for uid:', uid);
            return true;
        } catch (error) {
            console.error('[UserContextService] Error resetting context:', error);
            return false;
        }
    }

    /**
     * Get default context for new users
     * @returns {Object} Default context
     */
    getDefaultContext() {
        return {
            preferred_tone: 'balanced',
            preferred_format: 'structured',
            technical_level: 'intermediate',
            onboarding_completed: 0,
            onboarding_skipped: 0
        };
    }
}

// Singleton instance
const userContextService = new UserContextService();

module.exports = userContextService;
