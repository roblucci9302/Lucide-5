/**
 * Live Insights Repository - SQLite
 * Stores real-time insights detected during meetings
 */

const sqliteClient = require('../../../common/services/sqliteClient');
const { v4: uuidv4 } = require('uuid');

class LiveInsightsRepository {
    constructor() {
        console.log('[LiveInsightsRepository] Initialized');
    }

    /**
     * Create a new insight
     * @param {Object} insightData - Insight data
     * @returns {Object} Created insight with ID
     */
    create(insightData) {
        const dbInstance = sqliteClient.getDb();

        const id = insightData.id || uuidv4();
        const now = Math.floor(Date.now() / 1000);

        const stmt = dbInstance.prepare(`
            INSERT INTO live_insights (
                id, session_id, user_id, type, title, content,
                speaker, priority, timestamp, metadata,
                dismissed, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            id,
            insightData.session_id,
            insightData.user_id,
            insightData.type,
            insightData.title,
            insightData.content,
            insightData.speaker,
            insightData.priority,
            insightData.timestamp || Date.now(),
            insightData.metadata ? JSON.stringify(insightData.metadata) : null,
            insightData.dismissed ? 1 : 0,
            now,
            'clean'
        );

        console.log(`[LiveInsightsRepository] Created insight: ${id} (${insightData.type})`);

        return {
            id,
            ...insightData,
            created_at: now
        };
    }

    /**
     * Get insight by ID
     */
    getById(insightId) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights WHERE id = ?
        `);

        const row = stmt.get(insightId);

        if (row && row.metadata) {
            try {
                row.metadata = JSON.parse(row.metadata);
            } catch (e) {
                row.metadata = {};
            }
        }

        return row;
    }

    /**
     * Get all insights for a session
     */
    getBySessionId(sessionId) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights
            WHERE session_id = ?
            ORDER BY timestamp ASC
        `);

        const rows = stmt.all(sessionId);

        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
            }
            return row;
        });
    }

    /**
     * Get insights by type
     */
    getByType(sessionId, type) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights
            WHERE session_id = ? AND type = ?
            ORDER BY timestamp ASC
        `);

        const rows = stmt.all(sessionId, type);

        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
            }
            return row;
        });
    }

    /**
     * Get insights by priority
     */
    getByPriority(sessionId, priority) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights
            WHERE session_id = ? AND priority = ?
            ORDER BY timestamp DESC
        `);

        const rows = stmt.all(sessionId, priority);

        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
            }
            return row;
        });
    }

    /**
     * Get active (non-dismissed) insights
     */
    getActive(sessionId) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights
            WHERE session_id = ? AND dismissed = 0
            ORDER BY timestamp DESC
        `);

        const rows = stmt.all(sessionId);

        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
            }
            return row;
        });
    }

    /**
     * Get recent insights (last N)
     */
    getRecent(sessionId, limit = 10) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights
            WHERE session_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);

        const rows = stmt.all(sessionId, limit);

        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
            }
            return row;
        });
    }

    /**
     * Dismiss an insight
     */
    dismiss(insightId) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            UPDATE live_insights
            SET dismissed = 1, sync_state = 'dirty'
            WHERE id = ?
        `);

        const result = stmt.run(insightId);

        console.log(`[LiveInsightsRepository] Dismissed insight: ${insightId}`);

        return {
            success: result.changes > 0,
            changes: result.changes
        };
    }

    /**
     * Update insight
     */
    update(insightId, updates) {
        const dbInstance = sqliteClient.getDb();

        const allowedFields = ['title', 'content', 'priority', 'dismissed', 'metadata'];
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);

                if (key === 'metadata' && typeof updates[key] === 'object') {
                    values.push(JSON.stringify(updates[key]));
                } else if (key === 'dismissed') {
                    values.push(updates[key] ? 1 : 0);
                } else {
                    values.push(updates[key]);
                }
            }
        });

        if (fields.length === 0) {
            return { success: false, changes: 0 };
        }

        fields.push('sync_state = ?');
        values.push('dirty');
        values.push(insightId);

        const stmt = dbInstance.prepare(`
            UPDATE live_insights
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        const result = stmt.run(...values);

        console.log(`[LiveInsightsRepository] Updated insight: ${insightId}`);

        return {
            success: result.changes > 0,
            changes: result.changes
        };
    }

    /**
     * Delete insight by ID
     */
    deleteById(insightId) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            DELETE FROM live_insights WHERE id = ?
        `);

        const result = stmt.run(insightId);

        console.log(`[LiveInsightsRepository] Deleted insight: ${insightId}`);

        return {
            success: result.changes > 0,
            changes: result.changes
        };
    }

    /**
     * Delete all insights for a session
     */
    deleteBySessionId(sessionId) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            DELETE FROM live_insights WHERE session_id = ?
        `);

        const result = stmt.run(sessionId);

        console.log(`[LiveInsightsRepository] Deleted ${result.changes} insights for session: ${sessionId}`);

        return {
            success: true,
            deleted: result.changes
        };
    }

    /**
     * Get session statistics
     */
    getSessionStatistics(sessionId) {
        const dbInstance = sqliteClient.getDb();

        const totalStmt = dbInstance.prepare(`
            SELECT COUNT(*) as total FROM live_insights WHERE session_id = ?
        `);
        const total = totalStmt.get(sessionId).total;

        const activeStmt = dbInstance.prepare(`
            SELECT COUNT(*) as active FROM live_insights WHERE session_id = ? AND dismissed = 0
        `);
        const active = activeStmt.get(sessionId).active;

        const typeStmt = dbInstance.prepare(`
            SELECT type, COUNT(*) as count
            FROM live_insights
            WHERE session_id = ?
            GROUP BY type
        `);
        const byType = {};
        typeStmt.all(sessionId).forEach(row => {
            byType[row.type] = row.count;
        });

        const priorityStmt = dbInstance.prepare(`
            SELECT priority, COUNT(*) as count
            FROM live_insights
            WHERE session_id = ?
            GROUP BY priority
        `);
        const byPriority = {};
        priorityStmt.all(sessionId).forEach(row => {
            byPriority[row.priority] = row.count;
        });

        return {
            total,
            active,
            byType,
            byPriority
        };
    }

    /**
     * Get all insights for a user across sessions
     */
    getAllByUserId(userId, limit = 100) {
        const dbInstance = sqliteClient.getDb();

        const stmt = dbInstance.prepare(`
            SELECT * FROM live_insights
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);

        const rows = stmt.all(userId, limit);

        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
            }
            return row;
        });
    }
}

module.exports = new LiveInsightsRepository();
