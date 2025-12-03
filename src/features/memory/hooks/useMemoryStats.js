/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🪝 CUSTOM HOOK - useMemoryStats
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hook React personnalisé pour récupérer les statistiques de la mémoire augmentée
 * via IPC sécurisé (plus d'accès direct à la base de données).
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
 * const { stats, loading, error, refresh } = useMemoryStats({
 *   refreshInterval: 30000, // 30 seconds
 *   includeTimeline: true,
 *   includeKnowledgeGraph: true
 * });
 * ```
 *
 * SÉCURITÉ:
 * Ce hook utilise l'API IPC exposée via preload.js (window.lucide.memory)
 * au lieu d'importer directement les services du main process.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { useState, useEffect, useCallback, useRef } = require('react');

/**
 * Custom hook for memory statistics
 * @param {Object} options - Hook options
 * @param {number} options.refreshInterval - Auto-refresh interval in ms (0 = disabled)
 * @param {boolean} options.includeTimeline - Include timeline data
 * @param {boolean} options.includeKnowledgeGraph - Include knowledge graph stats
 * @param {number} options.timelineDays - Number of days for timeline (default: 30)
 * @returns {Object} { stats, loading, error, refresh }
 */
function useMemoryStats(options = {}) {
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
   * Fetch memory statistics via IPC
   */
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if API is available
      if (!window.lucide?.memory) {
        throw new Error('Memory API not available');
      }

      // Fetch all stats in parallel via IPC
      const promises = [
        window.lucide.memory.getStats()
      ];

      if (includeTimeline) {
        promises.push(window.lucide.memory.getTimeline(timelineDays));
      }

      if (includeKnowledgeGraph) {
        promises.push(window.lucide.memory.getKnowledgeGraphStats());
      }

      const results = await Promise.all(promises);

      // Extract results
      const mainStats = results[0];
      let timeline = null;
      let knowledgeGraph = null;

      if (includeTimeline && results[1]) {
        timeline = results[1].success ? results[1].timeline : null;
      }

      if (includeKnowledgeGraph) {
        const kgIndex = includeTimeline ? 2 : 1;
        if (results[kgIndex]) {
          knowledgeGraph = results[kgIndex].success ? results[kgIndex].stats : null;
        }
      }

      // Check if main stats request was successful
      if (!mainStats?.success) {
        throw new Error(mainStats?.error || 'Failed to fetch memory stats');
      }

      // Combine all stats
      const combinedStats = {
        global: mainStats.stats.global,
        recentActivity: mainStats.stats.recentActivity,
        timeline: timeline,
        knowledgeGraph: knowledgeGraph,
        topTags: mainStats.stats.topTags,
        importanceDistribution: mainStats.stats.importanceDistribution,
        storage: mainStats.stats.storage,
        externalSources: mainStats.stats.externalSources,
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
  }, [includeTimeline, includeKnowledgeGraph, timelineDays]);

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
