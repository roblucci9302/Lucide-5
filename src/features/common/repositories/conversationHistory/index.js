/**
 * Conversation History Repository
 *
 * Handles database operations for conversation history and search.
 */

const sqliteClient = require('../../services/sqliteClient');

// Fix CRITICAL BUG-C11: SQL injection prevention - whitelist allowed columns
const ALLOWED_SORT_COLUMNS = ['started_at', 'updated_at', 'title', 'type', 'id'];
const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

/**
 * Get all sessions for a user with metadata
 * @param {string} uid - User ID
 * @param {Object} options - Query options { limit, offset, sortBy, order }
 * @returns {Array} Sessions with metadata
 */
async function getAllSessions(uid, { limit, offset, sortBy, order }) {
    try {
        // Fix CRITICAL BUG-C11: Validate sortBy and order against whitelist
        if (!ALLOWED_SORT_COLUMNS.includes(sortBy)) {
            throw new Error(`Invalid sort column: ${sortBy}`);
        }
        const sanitizedOrder = ALLOWED_SORT_ORDERS.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

        const db = sqliteClient.getDatabase();
        const query = `
            SELECT
                s.*,
                COUNT(m.id) as actual_message_count,
                MAX(m.created_at) as last_message_at
            FROM sessions s
            LEFT JOIN ai_messages m ON s.id = m.session_id
            WHERE s.uid = ?
            GROUP BY s.id
            ORDER BY s.${sortBy} ${sanitizedOrder}
            LIMIT ? OFFSET ?
        `;

        return db.prepare(query).all(uid, limit, offset);
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error getting sessions:', error);
        // Fix CRITICAL BUG-C16: Propagate error instead of returning empty array
        throw error;
    }
}

/**
 * Search sessions by keyword
 * @param {string} uid - User ID
 * @param {string} query - Search query
 * @param {Object} filters - Filters { tags, startDate, endDate, agentProfile }
 * @returns {Array} Matching sessions
 */
async function searchSessions(uid, query, filters) {
    try {
        const db = sqliteClient.getDatabase();
        const { tags, startDate, endDate, agentProfile } = filters;

        let whereConditions = ['s.uid = ?'];
        let params = [uid];

        // Search in title, description, and message content
        if (query && query.length > 0) {
            whereConditions.push(`
                (s.title LIKE ? OR
                 s.description LIKE ? OR
                 s.id IN (
                     SELECT DISTINCT session_id
                     FROM ai_messages
                     WHERE content LIKE ?
                 ))
            `);
            const searchPattern = `%${query}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Filter by tags
        if (tags && tags.length > 0) {
            const tagConditions = tags.map(() => 's.tags LIKE ?').join(' OR ');
            whereConditions.push(`(${tagConditions})`);
            tags.forEach(tag => params.push(`%"${tag}"%`));
        }

        // Filter by date range
        if (startDate) {
            whereConditions.push('s.started_at >= ?');
            params.push(Math.floor(new Date(startDate).getTime() / 1000));
        }
        if (endDate) {
            whereConditions.push('s.started_at <= ?');
            params.push(Math.floor(new Date(endDate).getTime() / 1000));
        }

        // Filter by agent profile
        if (agentProfile) {
            whereConditions.push('s.agent_profile = ?');
            params.push(agentProfile);
        }

        const sqlQuery = `
            SELECT
                s.*,
                COUNT(m.id) as actual_message_count
            FROM sessions s
            LEFT JOIN ai_messages m ON s.id = m.session_id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY s.id
            ORDER BY s.updated_at DESC
            LIMIT 100
        `;

        return db.prepare(sqlQuery).all(...params);
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error searching sessions:', error);
        // Fix CRITICAL BUG-C16: Propagate error instead of returning empty array
        throw error;
    }
}

/**
 * Get messages for a session
 * @param {string} sessionId - Session ID
 * @returns {Array} Messages
 */
async function getSessionMessages(sessionId) {
    try {
        const db = sqliteClient.getDatabase();
        const query = `
            SELECT id, role, content, created_at, tokens, model
            FROM ai_messages
            WHERE session_id = ?
            ORDER BY created_at ASC
        `;

        return db.prepare(query).all(sessionId);
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error getting messages:', error);
        // Fix CRITICAL BUG-C16: Propagate error instead of returning empty array
        throw error;
    }
}

// Fix CRITICAL BUG-C11: SQL injection prevention - whitelist allowed update fields
// Fix HIGH BUG-H14: Verified complete - all session metadata fields whitelisted
const ALLOWED_UPDATE_FIELDS = ['tags', 'description', 'agent_profile', 'title', 'auto_title'];

/**
 * Update session metadata
 * @param {string} sessionId - Session ID
 * @param {Object} updates - Updates { tags, description, agent_profile, title, auto_title }
 * @returns {boolean} Success status
 */
async function updateMetadata(sessionId, updates) {
    try {
        if (Object.keys(updates).length === 0) {
            return false;
        }

        // Fix CRITICAL BUG-C11: Validate update keys against whitelist
        const sanitizedUpdates = {};
        for (const key of Object.keys(updates)) {
            if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
                throw new Error(`Invalid update field: ${key}`);
            }
            sanitizedUpdates[key] = updates[key];
        }

        const db = sqliteClient.getDatabase();
        const setClauses = Object.keys(sanitizedUpdates).map(key => `${key} = ?`).join(', ');
        const query = `UPDATE sessions SET ${setClauses} WHERE id = ?`;
        const params = [...Object.values(sanitizedUpdates), sessionId];

        const result = db.prepare(query).run(...params);
        return result.changes > 0;
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error updating metadata:', error);
        return false;
    }
}

/**
 * Get session statistics for a user
 * @param {string} uid - User ID
 * @returns {Object} Statistics
 */
async function getSessionStats(uid) {
    try {
        const db = sqliteClient.getDatabase();
        const stats = db.prepare(`
            SELECT
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN s.ended_at IS NULL THEN 1 ELSE 0 END) as active_sessions,
                COUNT(m.id) as total_messages,
                COUNT(DISTINCT DATE(s.started_at, 'unixepoch')) as days_with_activity,
                MAX(s.updated_at) as last_activity
            FROM sessions s
            LEFT JOIN ai_messages m ON s.id = m.session_id
            WHERE s.uid = ?
        `).get(uid);

        return stats || {
            total_sessions: 0,
            active_sessions: 0,
            total_messages: 0,
            days_with_activity: 0,
            last_activity: null
        };
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error getting stats:', error);
        return {};
    }
}

/**
 * Get message count for a session
 * @param {string} sessionId - Session ID
 * @returns {number} Message count
 */
async function getMessageCount(sessionId) {
    try {
        const db = sqliteClient.getDatabase();
        const result = db.prepare('SELECT COUNT(*) as count FROM ai_messages WHERE session_id = ?').get(sessionId);
        return result ? result.count : 0;
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error getting message count:', error);
        return 0;
    }
}

/**
 * Update message count for a session
 * @param {string} sessionId - Session ID
 * @param {number} count - New count
 * @returns {boolean} Success status
 */
async function updateMessageCount(sessionId, count) {
    try {
        const db = sqliteClient.getDatabase();
        const result = db.prepare('UPDATE sessions SET message_count = ? WHERE id = ?').run(count, sessionId);
        return result.changes > 0;
    } catch (error) {
        console.error('[ConversationHistoryRepository] Error updating message count:', error);
        return false;
    }
}

module.exports = {
    getAllSessions,
    searchSessions,
    getSessionMessages,
    updateMetadata,
    getSessionStats,
    getMessageCount,
    updateMessageCount
};
