/**
 * User Profile Repository
 *
 * Handles database operations for user profiles and profile switches
 * Part of Phase WOW 1: Profiles Intelligents & Agents Spécialisés
 */

const { createGenericRepository } = require('./genericRepository');
const { v4: uuidv4 } = require('uuid');

class UserProfileRepository {
    constructor() {
        this.profileRepo = createGenericRepository('user_profiles');
        this.switchRepo = createGenericRepository('profile_switches');
    }

    /**
     * Get user profile by UID
     * @param {string} uid - User ID
     * @returns {Promise<Object|null>} User profile or null
     */
    async getProfile(uid) {
        try {
            const profile = await this.profileRepo.queryOne(
                'SELECT * FROM user_profiles WHERE uid = ?',
                [uid]
            );

            // Parse JSON preferences if exists
            if (profile && profile.profile_preferences) {
                try {
                    profile.profile_preferences = JSON.parse(profile.profile_preferences);
                } catch (e) {
                    // Fix HIGH BUG-H16: Log which user has corrupt data for better diagnostics
                    console.error(
                        `[UserProfileRepository] Failed to parse preferences for uid=${uid}:`,
                        e.message,
                        `Raw data: ${profile.profile_preferences.substring(0, 100)}...`
                    );
                    profile.profile_preferences = {};
                }
            }

            return profile;
        } catch (error) {
            console.error('[UserProfileRepository] Error getting profile:', error);
            throw error;
        }
    }

    /**
     * Create a new user profile
     * @param {string} uid - User ID
     * @param {Object} options - Profile options
     * @returns {Promise<Object>} Created profile
     */
    async createProfile(uid, options = {}) {
        try {
            const now = Date.now();
            const profile = {
                uid,
                active_profile: options.active_profile || 'lucide_assistant',
                onboarding_completed: options.onboarding_completed || 0,
                profile_preferences: JSON.stringify(options.profile_preferences || {}),
                created_at: now,
                updated_at: now,
                sync_state: 'dirty'
            };

            await this.profileRepo.create(profile);

            return {
                ...profile,
                profile_preferences: JSON.parse(profile.profile_preferences)
            };
        } catch (error) {
            console.error('[UserProfileRepository] Error creating profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     * Fix HIGH BUG-H17: Authorization must be checked by caller before calling this method
     * The service layer should verify that the current user has permission to update this uid
     * @param {string} uid - User ID (must be validated by caller)
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>} Success status
     */
    async updateProfile(uid, updates) {
        // Fix HIGH BUG-H17: Validate uid parameter is provided
        if (!uid || typeof uid !== 'string') {
            throw new Error('[UserProfileRepository] Invalid uid provided for profile update');
        }

        try {
            const now = Date.now();
            const allowedFields = ['active_profile', 'onboarding_completed', 'profile_preferences'];

            const setClause = [];
            const params = [];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    setClause.push(`${key} = ?`);
                    // Stringify JSON fields
                    if (key === 'profile_preferences' && typeof value === 'object') {
                        params.push(JSON.stringify(value));
                    } else {
                        params.push(value);
                    }
                }
            }

            if (setClause.length === 0) {
                console.warn('[UserProfileRepository] No valid fields to update');
                return false;
            }

            // Add updated_at and sync_state
            setClause.push('updated_at = ?', 'sync_state = ?');
            params.push(now, 'dirty');

            // Add uid for WHERE clause
            params.push(uid);

            const sql = `UPDATE user_profiles SET ${setClause.join(', ')} WHERE uid = ?`;
            const result = await this.profileRepo.execute(sql, params);

            return result.changes > 0;
        } catch (error) {
            console.error('[UserProfileRepository] Error updating profile:', error);
            throw error;
        }
    }

    /**
     * Mark onboarding as completed
     * @param {string} uid - User ID
     * @returns {Promise<boolean>} Success status
     */
    async completeOnboarding(uid) {
        return this.updateProfile(uid, { onboarding_completed: 1 });
    }

    /**
     * Check if user has completed onboarding
     * @param {string} uid - User ID
     * @returns {Promise<boolean>} True if onboarding completed
     */
    async hasCompletedOnboarding(uid) {
        try {
            const profile = await this.getProfile(uid);
            return profile ? profile.onboarding_completed === 1 : false;
        } catch (error) {
            console.error('[UserProfileRepository] Error checking onboarding:', error);
            return false;
        }
    }

    /**
     * Record a profile switch
     * @param {string} uid - User ID
     * @param {string} fromProfile - Previous profile ID
     * @param {string} toProfile - New profile ID
     * @param {string} reason - 'manual' or 'auto'
     * @returns {Promise<Object>} Created switch record
     */
    async recordProfileSwitch(uid, fromProfile, toProfile, reason = 'manual') {
        try {
            const switchRecord = {
                id: uuidv4(),
                uid,
                from_profile: fromProfile,
                to_profile: toProfile,
                reason,
                switched_at: Date.now(),
                sync_state: 'dirty'
            };

            await this.switchRepo.create(switchRecord);
            return switchRecord;
        } catch (error) {
            console.error('[UserProfileRepository] Error recording switch:', error);
            throw error;
        }
    }

    /**
     * Get profile switch history for a user
     * @param {string} uid - User ID
     * @param {number} limit - Max number of records to return
     * @returns {Promise<Array>} List of profile switches
     */
    async getProfileSwitchHistory(uid, limit = 50) {
        try {
            const switches = await this.switchRepo.query(
                'SELECT * FROM profile_switches WHERE uid = ? ORDER BY switched_at DESC LIMIT ?',
                [uid, limit]
            );
            return switches;
        } catch (error) {
            console.error('[UserProfileRepository] Error getting switch history:', error);
            throw error;
        }
    }

    /**
     * Get profile switch statistics
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Statistics about profile usage
     */
    async getProfileSwitchStats(uid) {
        try {
            const stats = await this.switchRepo.query(`
                SELECT
                    to_profile as profile,
                    COUNT(*) as switch_count,
                    SUM(CASE WHEN reason = 'auto' THEN 1 ELSE 0 END) as auto_switches,
                    SUM(CASE WHEN reason = 'manual' THEN 1 ELSE 0 END) as manual_switches
                FROM profile_switches
                WHERE uid = ?
                GROUP BY to_profile
                ORDER BY switch_count DESC
            `, [uid]);

            return stats;
        } catch (error) {
            console.error('[UserProfileRepository] Error getting switch stats:', error);
            throw error;
        }
    }

    /**
     * Get or create profile (helper method)
     * @param {string} uid - User ID
     * @returns {Promise<Object>} User profile
     */
    async getOrCreateProfile(uid) {
        try {
            let profile = await this.getProfile(uid);

            if (!profile) {
                console.log('[UserProfileRepository] Creating new profile for user:', uid);
                profile = await this.createProfile(uid);
            }

            return profile;
        } catch (error) {
            console.error('[UserProfileRepository] Error in getOrCreateProfile:', error);
            throw error;
        }
    }
}

module.exports = new UserProfileRepository();
