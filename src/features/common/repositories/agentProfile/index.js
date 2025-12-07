/**
 * Agent Profile Repository
 *
 * Handles database operations for agent profiles.
 */

const sqliteClient = require('../../services/sqliteClient');

/**
 * Get active agent profile for a user
 * @param {string} uid - User ID
 * @returns {string|null} Profile ID
 */
async function getActiveProfile(uid) {
    try {
        const db = sqliteClient.getDatabase();
        const user = db.prepare('SELECT active_agent_profile FROM users WHERE uid = ?').get(uid);
        return user ? user.active_agent_profile : null;
    } catch (error) {
        console.error('[AgentProfileRepository] Error getting active profile:', error);
        return null;
    }
}

/**
 * Set active agent profile for a user
 * @param {string} uid - User ID
 * @param {string} profileId - Profile ID
 * @returns {boolean} Success status
 */
async function setActiveProfile(uid, profileId) {
    try {
        const db = sqliteClient.getDatabase();
        const stmt = db.prepare('UPDATE users SET active_agent_profile = ? WHERE uid = ?');
        const result = stmt.run(profileId, uid);
        return result.changes > 0;
    } catch (error) {
        console.error('[AgentProfileRepository] Error setting active profile:', error);
        return false;
    }
}

/**
 * Check if user exists
 * @param {string} uid - User ID
 * @returns {boolean} True if user exists
 */
async function userExists(uid) {
    try {
        const db = sqliteClient.getDatabase();
        const user = db.prepare('SELECT uid FROM users WHERE uid = ?').get(uid);
        return !!user;
    } catch (error) {
        console.error('[AgentProfileRepository] Error checking user existence:', error);
        return false;
    }
}

module.exports = {
    getActiveProfile,
    setActiveProfile,
    userExists
};
