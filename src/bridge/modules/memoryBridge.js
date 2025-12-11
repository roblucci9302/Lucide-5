/**
 * Memory Bridge - IPC handlers for Memory Dashboard feature
 *
 * Provides secure IPC communication between renderer (Memory components)
 * and main process (SQLite/services).
 *
 * This bridge replaces direct service access in Memory components,
 * following Electron's security best practices for main/renderer separation.
 */

const { ipcMain } = require('electron');
const sqliteClient = require('../../features/common/services/sqliteClient');
const knowledgeOrganizerService = require('../../features/common/services/knowledgeOrganizerService');
const autoIndexingService = require('../../features/common/services/autoIndexingService');
const authService = require('../../features/common/services/authService');
const { JsonUtils } = require('../../features/common/utils/validators');

function initialize() {
    console.log('[MemoryBridge] Initializing memory IPC handlers...');

    // ═══════════════════════════════════════════════════════════════════════
    // MEMORY STATISTICS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get global memory statistics
     * Returns counts of indexed content by type and overall stats
     */
    ipcMain.handle('memory:get-stats', async () => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            // Get memory_stats table data
            const memoryStats = db.prepare(`
                SELECT * FROM memory_stats WHERE uid = ?
            `).get(userId);

            // Get counts by source type from auto_indexed_content
            const sourceStats = db.prepare(`
                SELECT source_type, COUNT(*) as count
                FROM auto_indexed_content
                WHERE uid = ?
                GROUP BY source_type
            `).all(userId);

            // Get total documents count
            const documentsCount = db.prepare(`
                SELECT COUNT(*) as count FROM documents WHERE uid = ?
            `).get(userId);

            return {
                success: true,
                data: {
                    memoryStats: memoryStats || {
                        total_elements: 0,
                        documents_count: 0,
                        conversations_indexed: 0,
                        screenshots_indexed: 0,
                        audio_indexed: 0,
                        ai_responses_indexed: 0
                    },
                    sourceStats: sourceStats || [],
                    documentsCount: documentsCount?.count || 0
                }
            };
        } catch (error) {
            console.error('[MemoryBridge] Error getting stats:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get memory timeline (items indexed per day)
     * Used for timeline visualization in Memory Dashboard
     */
    ipcMain.handle('memory:get-timeline', async (event, { days = 30 }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

            const timeline = db.prepare(`
                SELECT
                    DATE(indexed_at / 1000, 'unixepoch') as date,
                    source_type,
                    COUNT(*) as count
                FROM auto_indexed_content
                WHERE uid = ? AND indexed_at >= ?
                GROUP BY date, source_type
                ORDER BY date DESC
            `).all(userId, cutoffTime);

            return { success: true, data: timeline };
        } catch (error) {
            console.error('[MemoryBridge] Error getting timeline:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get knowledge graph statistics
     * Returns entity counts by type and top entities
     */
    ipcMain.handle('memory:get-knowledge-graph-stats', async () => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            // Get entity counts by type
            const byType = db.prepare(`
                SELECT entity_type, COUNT(*) as count
                FROM knowledge_graph
                WHERE uid = ?
                GROUP BY entity_type
            `).all(userId);

            // Get top entities by importance
            const topEntities = db.prepare(`
                SELECT entity_type, entity_name, mention_count, importance_score
                FROM knowledge_graph
                WHERE uid = ?
                ORDER BY importance_score DESC, mention_count DESC
                LIMIT 10
            `).all(userId);

            // Calculate total entities
            const totalEntities = byType.reduce((sum, item) => sum + item.count, 0);

            // Transform byType to object format
            const byTypeObj = {};
            for (const item of byType) {
                byTypeObj[item.entity_type] = item.count;
            }

            return {
                success: true,
                data: {
                    totalEntities,
                    byType: byTypeObj,
                    topEntities
                }
            };
        } catch (error) {
            console.error('[MemoryBridge] Error getting KG stats:', error);
            return { success: false, error: error.message };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SEARCH & RETRIEVAL
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Search memory content
     * Supports filtering by source types array, project, importance, dates, and text search
     */
    ipcMain.handle('memory:search', async (event, { query, filters = {} }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            let sql = `
                SELECT id, source_type, source_id, source_title, content, content_summary,
                       tags, entities, project, importance_score, indexed_at, created_at
                FROM auto_indexed_content
                WHERE uid = ?
            `;
            const params = [userId];

            // Add text search filter
            if (query && query.trim()) {
                sql += ` AND (content LIKE ? OR source_title LIKE ? OR tags LIKE ? OR content_summary LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            // Add source types filter (array support)
            if (filters.sources && Array.isArray(filters.sources) && filters.sources.length > 0) {
                sql += ` AND source_type IN (${filters.sources.map(() => '?').join(',')})`;
                params.push(...filters.sources);
            } else if (filters.sourceType) {
                // Single source type (backward compatibility)
                sql += ` AND source_type = ?`;
                params.push(filters.sourceType);
            }

            // Add project filter
            if (filters.project) {
                sql += ` AND project = ?`;
                params.push(filters.project);
            }

            // Add date range filter
            if (filters.dateFrom || filters.startDate) {
                sql += ` AND indexed_at >= ?`;
                params.push(filters.dateFrom || filters.startDate);
            }
            if (filters.dateTo || filters.endDate) {
                const endDate = filters.dateTo || filters.endDate;
                sql += ` AND indexed_at <= ?`;
                params.push(endDate.includes(' ') ? endDate : endDate + ' 23:59:59');
            }

            // Add importance filter
            if (filters.importance && filters.importance !== 'all') {
                if (filters.importance === 'high') {
                    sql += ` AND importance_score >= 0.8`;
                } else if (filters.importance === 'medium') {
                    sql += ` AND importance_score >= 0.5 AND importance_score < 0.8`;
                } else if (filters.importance === 'low') {
                    sql += ` AND importance_score < 0.5`;
                }
            }

            // Order and limit
            sql += ` ORDER BY importance_score DESC, indexed_at DESC`;
            const limit = filters.limit || 50;
            sql += ` LIMIT ?`;
            params.push(limit);

            const results = db.prepare(sql).all(...params);

            // Score results by keyword matching for relevance
            const queryLower = (query || '').toLowerCase();
            const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

            const scoredResults = results.map(r => {
                const contentLower = (r.content || '').toLowerCase();
                const summaryLower = (r.content_summary || '').toLowerCase();
                const tagsLower = (r.tags || '').toLowerCase();

                let relevance_score = r.importance_score || 0.5;

                // Keyword matching boost
                if (queryWords.length > 0) {
                    const matches = queryWords.filter(word =>
                        contentLower.includes(word) || summaryLower.includes(word) || tagsLower.includes(word)
                    ).length;
                    relevance_score += (matches / queryWords.length) * 0.3;
                }

                const parsedTags = JsonUtils.safeParseArray(r.tags);
                const parsedEntities = JsonUtils.safeParseObject(r.entities);

                return {
                    ...r,
                    relevance_score: Math.min(relevance_score, 1.0),
                    tags: parsedTags,
                    entities: parsedEntities,
                    metadata: {
                        tags: parsedTags,
                        entities: parsedEntities
                    }
                };
            });

            // Sort by relevance score
            scoredResults.sort((a, b) => b.relevance_score - a.relevance_score);

            return { success: true, results: scoredResults };
        } catch (error) {
            console.error('[MemoryBridge] Error searching:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get content by ID
     * Returns full content details including raw content
     */
    ipcMain.handle('memory:get-content', async (event, { contentId }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            const content = db.prepare(`
                SELECT * FROM auto_indexed_content
                WHERE id = ? AND uid = ?
            `).get(contentId, userId);

            if (!content) {
                throw new Error('Content not found');
            }

            // Parse JSON fields safely
            content.tags = JsonUtils.safeParseArray(content.tags);
            content.entities = JsonUtils.safeParseObject(content.entities);

            return { success: true, data: content };
        } catch (error) {
            console.error('[MemoryBridge] Error getting content:', error);
            return { success: false, error: error.message };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CONTENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Delete indexed content
     */
    ipcMain.handle('memory:delete-content', async (event, { contentId }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            const result = db.prepare(`
                DELETE FROM auto_indexed_content
                WHERE id = ? AND uid = ?
            `).run(contentId, userId);

            // Update memory stats
            if (result.changes > 0) {
                db.prepare(`
                    UPDATE memory_stats
                    SET total_elements = total_elements - 1,
                        updated_at = ?
                    WHERE uid = ?
                `).run(Date.now(), userId);
            }

            return { success: true, deleted: result.changes > 0 };
        } catch (error) {
            console.error('[MemoryBridge] Error deleting content:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Manually trigger indexing of a conversation session
     */
    ipcMain.handle('memory:index-session', async (event, { sessionId }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const result = await autoIndexingService.indexConversation(sessionId, userId);
            return { success: true, data: result };
        } catch (error) {
            console.error('[MemoryBridge] Error indexing session:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Manually trigger indexing of an audio session
     */
    ipcMain.handle('memory:index-audio', async (event, { sessionId }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const result = await autoIndexingService.indexAudioSession(sessionId, userId);
            return { success: true, data: result };
        } catch (error) {
            console.error('[MemoryBridge] Error indexing audio:', error);
            return { success: false, error: error.message };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // KNOWLEDGE GRAPH
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get knowledge graph entities for visualization
     */
    ipcMain.handle('memory:get-knowledge-graph', async (event, { limit = 100 }) => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            // Get entities
            const entities = db.prepare(`
                SELECT id, entity_type, entity_name, entity_description,
                       mention_count, importance_score, related_entities,
                       first_seen, last_seen
                FROM knowledge_graph
                WHERE uid = ?
                ORDER BY importance_score DESC, mention_count DESC
                LIMIT ?
            `).all(userId, limit);

            // Parse related_entities JSON
            const parsedEntities = entities.map(e => ({
                ...e,
                related_entities: e.related_entities ? JSON.parse(e.related_entities) : []
            }));

            return { success: true, entities: parsedEntities };
        } catch (error) {
            console.error('[MemoryBridge] Error getting knowledge graph:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get projects list for filtering
     */
    ipcMain.handle('memory:get-projects', async () => {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const db = sqliteClient.getDb();
            if (!db) {
                throw new Error('Database not initialized');
            }

            const projects = db.prepare(`
                SELECT DISTINCT project, COUNT(*) as count
                FROM auto_indexed_content
                WHERE uid = ? AND project IS NOT NULL AND project != ''
                GROUP BY project
                ORDER BY count DESC
            `).all(userId);

            return { success: true, data: projects };
        } catch (error) {
            console.error('[MemoryBridge] Error getting projects:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[MemoryBridge] ✅ Memory IPC handlers initialized (12 handlers)');
}

module.exports = { initialize };
