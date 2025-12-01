const sqliteClient = require('./sqliteClient');
const sessionRepository = require('../repositories/session');
const { SessionValidator, QueryValidator } = require('../utils/validators');
const LRUCache = require('../utils/lruCache');

/**
 * Escape SQL LIKE special characters to prevent injection
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeSqlLike(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    return str
        .replace(/\\/g, '\\\\')  // Escape backslash first
        .replace(/%/g, '\\%')    // Escape percent wildcard
        .replace(/_/g, '\\_');   // Escape underscore wildcard
}

/**
 * Service for managing conversation history and enhanced search
 * Phase 2: Persistent memory with rich metadata
 */
class ConversationHistoryService {
    constructor() {
        // LRU Cache for title generation (max 100 items, 1 hour TTL)
        this.titleGenerationCache = new LRUCache({
            max: 100,
            ttl: 60 * 60 * 1000  // 1 hour in milliseconds
        });
    }

    /**
     * Get all sessions for a user with enriched metadata
     * @param {string} uid - User ID
     * @param {object} options - Query options (limit, offset, sortBy)
     * @returns {Array} List of sessions with metadata
     */
    async getAllSessions(uid, options = {}) {
        const {
            limit = 50,
            offset = 0,
            sortBy = 'updated_at', // 'updated_at', 'started_at', 'title'
            order = 'DESC'
        } = options;

        try {
            // Validate sortBy to prevent SQL injection
            const ALLOWED_SORT_COLUMNS = ['updated_at', 'started_at', 'title', 'created_at'];
            const validSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'updated_at';

            // Validate order to prevent SQL injection
            const ALLOWED_ORDERS = ['ASC', 'DESC'];
            const validOrder = ALLOWED_ORDERS.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

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
                ORDER BY s.${validSortBy} ${validOrder}
                LIMIT ? OFFSET ?
            `;

            const sessions = db.prepare(query).all(uid, limit, offset);

            // Parse JSON fields and add computed properties
            return sessions.map(session => ({
                ...session,
                tags: session.tags ? JSON.parse(session.tags) : [],
                duration: session.ended_at ? session.ended_at - session.started_at : null,
                is_active: !session.ended_at
            }));
        } catch (error) {
            console.error('[ConversationHistoryService] Error getting sessions:', error);
            return [];
        }
    }

    /**
     * Search sessions by keyword (in title, description, or message content)
     * @param {string} uid - User ID
     * @param {string} query - Search query
     * @param {object} filters - Filters (tags, dateRange, agentProfile)
     * @returns {Array} Matching sessions
     */
    async searchSessions(uid, query, filters = {}) {
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
                // Security: Escape SQL LIKE special characters
                const escapedQuery = escapeSqlLike(query);
                const searchPattern = `%${escapedQuery}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            // Filter by tags
            if (tags && tags.length > 0) {
                // Tags stored as JSON array, so we use LIKE for each tag
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

            const sessions = db.prepare(sqlQuery).all(...params);

            return sessions.map(session => ({
                ...session,
                tags: session.tags ? JSON.parse(session.tags) : [],
                is_active: !session.ended_at
            }));
        } catch (error) {
            console.error('[ConversationHistoryService] Error searching sessions:', error);
            return [];
        }
    }

    /**
     * Get conversation messages for a session
     * @param {string} sessionId - Session ID
     * @returns {Array} Messages with role and content
     */
    async getSessionMessages(sessionId) {
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
            console.error('[ConversationHistoryService] Error getting messages:', error);
            return [];
        }
    }

    /**
     * Generate intelligent title from first user message
     * @param {string} sessionId - Session ID
     * @returns {string} Generated title
     */
    async generateTitleFromContent(sessionId) {
        // Check cache first
        if (this.titleGenerationCache.has(sessionId)) {
            return this.titleGenerationCache.get(sessionId);
        }

        try {
            const messages = await this.getSessionMessages(sessionId);
            const firstUserMessage = messages.find(m => m.role === 'user');

            if (!firstUserMessage) {
                return 'New Conversation';
            }

            // Extract first meaningful sentence or phrase (max 60 chars)
            let content = firstUserMessage.content.trim();

            // Remove common prefixes
            content = content.replace(/^(hi|hello|hey|bonjour|salut)[,\s]*/i, '');

            // Take first sentence or first 60 chars
            const firstSentence = content.split(/[.!?]/)[0];
            let title = firstSentence.length > 60
                ? firstSentence.substring(0, 57) + '...'
                : firstSentence;

            // Capitalize first letter
            title = title.charAt(0).toUpperCase() + title.slice(1);

            // Cache the result
            this.titleGenerationCache.set(sessionId, title);

            return title;
        } catch (error) {
            console.error('[ConversationHistoryService] Error generating title:', error);
            return 'Conversation';
        }
    }

    /**
     * Update session metadata (tags, description, agent_profile)
     * @param {string} sessionId - Session ID
     * @param {object} metadata - Metadata to update
     * @returns {boolean} Success status
     */
    async updateSessionMetadata(sessionId, metadata) {
        try {
            // Validate metadata
            const validation = SessionValidator.validateMetadata(metadata);
            if (!validation.valid) {
                console.warn('[ConversationHistoryService] Invalid metadata:', validation.errors);
                return false;
            }

            const db = sqliteClient.getDatabase();
            const updates = [];
            const params = [];

            if (metadata.tags !== undefined) {
                updates.push('tags = ?');
                params.push(JSON.stringify(metadata.tags));
            }

            if (metadata.description !== undefined) {
                updates.push('description = ?');
                params.push(metadata.description);
            }

            if (metadata.agent_profile !== undefined) {
                updates.push('agent_profile = ?');
                params.push(metadata.agent_profile);
            }

            if (metadata.title !== undefined) {
                updates.push('title = ?, auto_title = ?');
                params.push(metadata.title, 0); // Manual title
            }

            if (updates.length === 0) {
                return false;
            }

            updates.push('updated_at = ?');
            params.push(Math.floor(Date.now() / 1000));

            params.push(sessionId);

            const query = `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            return result.changes > 0;
        } catch (error) {
            console.error('[ConversationHistoryService] Error updating metadata:', error);
            return false;
        }
    }

    /**
     * Update message count for a session
     * @param {string} sessionId - Session ID
     */
    async updateMessageCount(sessionId) {
        try {
            const db = sqliteClient.getDatabase();
            const countQuery = 'SELECT COUNT(*) as count FROM ai_messages WHERE session_id = ?';
            const { count } = db.prepare(countQuery).get(sessionId);

            const updateQuery = 'UPDATE sessions SET message_count = ? WHERE id = ?';
            db.prepare(updateQuery).run(count, sessionId);

            return count;
        } catch (error) {
            console.error('[ConversationHistoryService] Error updating message count:', error);
            return 0;
        }
    }

    /**
     * Get session statistics for a user
     * @param {string} uid - User ID
     * @returns {object} Statistics
     */
    async getSessionStats(uid) {
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
            console.error('[ConversationHistoryService] Error getting stats:', error);
            return {};
        }
    }

    /**
     * Delete a session and all its messages
     * @param {string} sessionId - Session ID
     * @returns {boolean} Success status
     */
    async deleteSession(sessionId) {
        try {
            await sessionRepository.deleteWithRelatedData(sessionId);
            this.titleGenerationCache.delete(sessionId);
            return true;
        } catch (error) {
            console.error('[ConversationHistoryService] Error deleting session:', error);
            return false;
        }
    }
}

// Singleton instance
const conversationHistoryService = new ConversationHistoryService();

module.exports = conversationHistoryService;
