/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🪝 CUSTOM HOOK - useMemoryStats
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hook React personnalisé pour récupérer les statistiques de la mémoire augmentée
 * en temps réel depuis la base de données SQLite.
 *
 * FONCTIONNALITÉS:
 * ├── 📊 Statistiques globales (total items, by source type)
 * ├── 🔄 Auto-refresh configurable
 * ├── 📈 Trending topics & entities
 * ├── ⏱️ Timeline data (items par jour)
 * └── 🎯 Knowledge Graph stats
 *
 * UTILISATION:
 * ```jsx
 * const { stats, loading, error, refresh } = useMemoryStats(uid, {
 *   refreshInterval: 30000, // 30 seconds
 *   includeTimeline: true,
 *   includeKnowledgeGraph: true
 * });
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { useState, useEffect, useCallback, useRef } = require('react');

// Services
const sqliteClient = require('../../common/services/sqliteClient');
const knowledgeOrganizerService = require('../../common/services/knowledgeOrganizerService');
const autoIndexingService = require('../../common/services/autoIndexingService');

/**
 * Custom hook for memory statistics
 * @param {string} uid - User ID
 * @param {Object} options - Hook options
 * @param {number} options.refreshInterval - Auto-refresh interval in ms (0 = disabled)
 * @param {boolean} options.includeTimeline - Include timeline data
 * @param {boolean} options.includeKnowledgeGraph - Include knowledge graph stats
 * @param {number} options.timelineDays - Number of days for timeline (default: 30)
 * @returns {Object} { stats, loading, error, refresh }
 */
function useMemoryStats(uid, options = {}) {
  const {
    refreshInterval = 0,
    includeTimeline = true,
    includeKnowledgeGraph = true,
    timelineDays = 30
  } = options;

  // State
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Fetch memory statistics
   */
  const fetchStats = useCallback(async () => {
    if (!uid) {
      setError(new Error('User ID is required'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const db = sqliteClient.getDb();
      if (!db) {
        throw new Error('Database not initialized');
      }

      // ===================================================================
      // 1. GLOBAL STATS - Count by source type
      // ===================================================================
      const globalStats = {
        totalItems: 0,
        bySourceType: {
          conversation: 0,
          screenshot: 0,
          audio: 0,
          external_database: 0
        },
        lastUpdated: new Date().toISOString()
      };

      // Query for each source type
      const sourceTypes = ['conversation', 'screenshot', 'audio', 'external_database'];
      for (const sourceType of sourceTypes) {
        const result = db.prepare(`
          SELECT COUNT(*) as count
          FROM auto_indexed_content
          WHERE uid = ? AND source_type = ?
        `).get(uid, sourceType);

        globalStats.bySourceType[sourceType] = result.count;
        globalStats.totalItems += result.count;
      }

      // ===================================================================
      // 2. RECENT ACTIVITY - Last 7 days
      // ===================================================================
      const recentActivityQuery = db.prepare(`
        SELECT
          source_type,
          COUNT(*) as count,
          MAX(indexed_at) as last_indexed
        FROM auto_indexed_content
        WHERE uid = ?
          AND indexed_at >= datetime('now', '-7 days')
        GROUP BY source_type
      `).all(uid);

      const recentActivity = {
        last7Days: {},
        totalLast7Days: 0
      };

      recentActivityQuery.forEach(row => {
        recentActivity.last7Days[row.source_type] = {
          count: row.count,
          lastIndexed: row.last_indexed
        };
        recentActivity.totalLast7Days += row.count;
      });

      // ===================================================================
      // 3. TIMELINE DATA (optional)
      // ===================================================================
      let timelineData = null;
      if (includeTimeline) {
        const timelineQuery = db.prepare(`
          SELECT
            DATE(indexed_at) as date,
            source_type,
            COUNT(*) as count
          FROM auto_indexed_content
          WHERE uid = ?
            AND indexed_at >= datetime('now', '-${timelineDays} days')
          GROUP BY DATE(indexed_at), source_type
          ORDER BY date DESC
        `).all(uid);

        // Group by date
        timelineData = {};
        timelineQuery.forEach(row => {
          if (!timelineData[row.date]) {
            timelineData[row.date] = {
              date: row.date,
              total: 0,
              byType: {}
            };
          }
          timelineData[row.date].byType[row.source_type] = row.count;
          timelineData[row.date].total += row.count;
        });

        // Convert to array and sort by date
        timelineData = Object.values(timelineData).sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        );
      }

      // ===================================================================
      // 4. KNOWLEDGE GRAPH STATS (optional)
      // ===================================================================
      let knowledgeGraphStats = null;
      if (includeKnowledgeGraph) {
        try {
          knowledgeGraphStats = await knowledgeOrganizerService.getKnowledgeGraphStats(uid);
        } catch (err) {
          console.warn('[useMemoryStats] Failed to fetch knowledge graph stats:', err.message);
          // Non-blocking error
        }
      }

      // ===================================================================
      // 5. TOP ENTITIES & TAGS
      // ===================================================================
      const topTagsQuery = db.prepare(`
        SELECT tags
        FROM auto_indexed_content
        WHERE uid = ? AND tags IS NOT NULL AND tags != '[]'
        LIMIT 100
      `).all(uid);

      const tagCounts = {};
      topTagsQuery.forEach(row => {
        try {
          const tags = JSON.parse(row.tags);
          tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        } catch (e) {
          // Ignore invalid JSON
        }
      });

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      // ===================================================================
      // 6. IMPORTANCE DISTRIBUTION
      // ===================================================================
      const importanceQuery = db.prepare(`
        SELECT
          CASE
            WHEN importance_score >= 0.8 THEN 'high'
            WHEN importance_score >= 0.5 THEN 'medium'
            ELSE 'low'
          END as importance_level,
          COUNT(*) as count
        FROM auto_indexed_content
        WHERE uid = ?
        GROUP BY importance_level
      `).all(uid);

      const importanceDistribution = {
        high: 0,
        medium: 0,
        low: 0
      };

      importanceQuery.forEach(row => {
        importanceDistribution[row.importance_level] = row.count;
      });

      // ===================================================================
      // 7. STORAGE SIZE ESTIMATE
      // ===================================================================
      const sizeQuery = db.prepare(`
        SELECT
          SUM(LENGTH(content)) as total_content_size,
          AVG(LENGTH(content)) as avg_content_size
        FROM auto_indexed_content
        WHERE uid = ?
      `).get(uid);

      const storageStats = {
        totalContentBytes: sizeQuery.total_content_size || 0,
        avgContentBytes: Math.round(sizeQuery.avg_content_size || 0),
        estimatedTotalMB: ((sizeQuery.total_content_size || 0) / (1024 * 1024)).toFixed(2)
      };

      // ===================================================================
      // 8. EXTERNAL SOURCES
      // ===================================================================
      const externalSourcesQuery = db.prepare(`
        SELECT
          id,
          source_type,
          source_name,
          is_active,
          last_synced_at
        FROM external_sources
        WHERE uid = ?
        ORDER BY last_synced_at DESC
      `).all(uid);

      const externalSources = externalSourcesQuery.map(source => ({
        id: source.id,
        type: source.source_type,
        name: source.source_name,
        active: source.is_active === 1,
        lastSynced: source.last_synced_at
      }));

      // ===================================================================
      // COMBINE ALL STATS
      // ===================================================================
      const combinedStats = {
        global: globalStats,
        recentActivity,
        timeline: timelineData,
        knowledgeGraph: knowledgeGraphStats,
        topTags,
        importanceDistribution,
        storage: storageStats,
        externalSources,
        fetchedAt: new Date().toISOString()
      };

      // Update state only if component is still mounted
      if (mountedRef.current) {
        setStats(combinedStats);
        setLoading(false);
      }

    } catch (err) {
      console.error('[useMemoryStats] Error fetching stats:', err);
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [uid, includeTimeline, includeKnowledgeGraph, timelineDays]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  /**
   * Initial fetch and auto-refresh setup
   */
  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Setup auto-refresh if interval > 0
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchStats();
      }, refreshInterval);

      // Cleanup interval on unmount
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchStats, refreshInterval]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    stats,
    loading,
    error,
    refresh
  };
}

module.exports = useMemoryStats;
