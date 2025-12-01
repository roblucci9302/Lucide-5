/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎛️ COMPONENT - MemoryDashboard
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composant React principal pour le dashboard de la mémoire augmentée.
 * Combine SourceStats, MemoryTimeline, et Knowledge Graph stats.
 *
 * FEATURES:
 * ├── 📊 Statistiques détaillées par source
 * ├── ⏱️ Timeline interactive
 * ├── 🔄 Auto-refresh configurable
 * ├── 🧠 Integration Knowledge Graph
 * ├── 🎨 Layout responsive
 * └── 🔍 Vue d'ensemble complète de la mémoire
 *
 * PROPS:
 * - uid: string - User ID (required)
 * - refreshInterval: number - Auto-refresh in ms (default: 0 = disabled)
 * - timelineDays: number - Days to show in timeline (default: 30)
 * - onDateClick: Function - Callback when timeline date is clicked
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const React = require('react');
const { useState, useCallback } = React;

// Hooks
const useMemoryStats = require('../hooks/useMemoryStats');

// Components
const SourceStats = require('./SourceStats');
const MemoryTimeline = require('./MemoryTimeline');

/**
 * Knowledge Graph Stats Card component
 */
function KnowledgeGraphStats({ kgStats }) {
  if (!kgStats) return null;

  const { totalEntities, byType, topEntities } = kgStats;

  return (
    <div className="knowledge-graph-stats">
      <div className="kg-header">
        <h3>🧠 Knowledge Graph</h3>
        <p className="kg-subtitle">
          Entities extracted from your memory
        </p>
      </div>

      <div className="kg-summary">
        <div className="kg-total">
          <span className="kg-total-value">{totalEntities}</span>
          <span className="kg-total-label">Total Entities</span>
        </div>

        <div className="kg-breakdown">
          {Object.entries(byType).map(([type, count]) => {
            if (count === 0) return null;

            const icons = {
              projects: '📁',
              people: '👤',
              companies: '🏢',
              topics: '📌',
              technologies: '⚙️',
              dates: '📅',
              locations: '📍'
            };

            return (
              <div key={type} className="kg-type-item">
                <span className="kg-type-icon">{icons[type] || '🏷️'}</span>
                <span className="kg-type-label">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
                <span className="kg-type-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {topEntities && topEntities.length > 0 && (
        <div className="kg-top-entities">
          <h4 className="kg-section-title">Top Entities</h4>
          <div className="kg-entities-list">
            {topEntities.slice(0, 8).map((entity, index) => {
              const icons = {
                project: '📁',
                person: '👤',
                company: '🏢',
                topic: '📌',
                technology: '⚙️',
                date: '📅',
                location: '📍'
              };

              return (
                <div key={`${entity.entity_type}-${entity.entity_name}`} className="kg-entity-item">
                  <span className="kg-entity-rank">#{index + 1}</span>
                  <span className="kg-entity-icon">
                    {icons[entity.entity_type] || '🏷️'}
                  </span>
                  <span className="kg-entity-name">{entity.entity_name}</span>
                  <span className="kg-entity-mentions">
                    {entity.mention_count} mention{entity.mention_count > 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tab Navigation component
 */
function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'timeline', label: 'Timeline', icon: '⏱️' },
    { id: 'knowledge', label: 'Knowledge Graph', icon: '🧠' }
  ];

  return (
    <div className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Error Alert component
 */
function ErrorAlert({ error, onDismiss }) {
  return (
    <div className="error-alert">
      <div className="error-alert-content">
        <span className="error-alert-icon">⚠️</span>
        <div className="error-alert-message">
          <strong>Error loading memory statistics</strong>
          <p>{error.message || 'An unknown error occurred'}</p>
        </div>
      </div>
      {onDismiss && (
        <button className="error-alert-dismiss" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Main MemoryDashboard component
 */
function MemoryDashboard({
  uid,
  refreshInterval = 0,
  timelineDays = 30,
  onDateClick
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showError, setShowError] = useState(true);

  // Use memory stats hook
  const { stats, loading, error, refresh } = useMemoryStats(uid, {
    refreshInterval,
    includeTimeline: true,
    includeKnowledgeGraph: true,
    timelineDays
  });

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  /**
   * Handle error dismiss
   */
  const handleErrorDismiss = useCallback(() => {
    setShowError(false);
  }, []);

  /**
   * No user ID
   */
  if (!uid) {
    return (
      <div className="memory-dashboard error">
        <div className="dashboard-error-state">
          <span className="error-icon">⚠️</span>
          <h2>User ID Required</h2>
          <p>Please provide a user ID to view memory statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-dashboard">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>🧠 Augmented Memory Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time view of your personalized knowledge base
          </p>
        </div>
        <div className="dashboard-actions">
          {refreshInterval > 0 && (
            <span className="auto-refresh-indicator">
              🔄 Auto-refresh: {(refreshInterval / 1000)}s
            </span>
          )}
          <button
            className="btn-refresh-main"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Now'}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ERROR ALERT */}
      {/* ========================================================= */}
      {error && showError && (
        <ErrorAlert error={error} onDismiss={handleErrorDismiss} />
      )}

      {/* ========================================================= */}
      {/* TAB NAVIGATION */}
      {/* ========================================================= */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* ========================================================= */}
      {/* LOADING STATE */}
      {/* ========================================================= */}
      {loading && !stats && (
        <div className="dashboard-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading memory statistics...</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB CONTENT */}
      {/* ========================================================= */}
      {!loading || stats ? (
        <div className="dashboard-content">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="tab-content overview-tab">
              <SourceStats
                stats={stats}
                loading={loading}
                onRefresh={handleRefresh}
              />

              {stats && stats.knowledgeGraph && (
                <div className="overview-knowledge-graph-preview">
                  <KnowledgeGraphStats kgStats={stats.knowledgeGraph} />
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="tab-content timeline-tab">
              <MemoryTimeline
                timeline={stats?.timeline}
                onDateClick={onDateClick}
                maxDays={timelineDays}
              />
            </div>
          )}

          {/* KNOWLEDGE GRAPH TAB */}
          {activeTab === 'knowledge' && (
            <div className="tab-content knowledge-tab">
              {stats && stats.knowledgeGraph ? (
                <KnowledgeGraphStats kgStats={stats.knowledgeGraph} />
              ) : (
                <div className="knowledge-empty-state">
                  <span className="empty-icon">🧠</span>
                  <h3>No Knowledge Graph Data</h3>
                  <p>
                    Start indexing content with entity extraction enabled to build your knowledge graph
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}
      {stats && (
        <div className="dashboard-footer">
          <div className="dashboard-footer-info">
            <span>Last updated: {new Date(stats.fetchedAt).toLocaleString()}</span>
            <span>•</span>
            <span>User: {uid}</span>
            {refreshInterval > 0 && (
              <>
                <span>•</span>
                <span>Next refresh in: {(refreshInterval / 1000)}s</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

module.exports = MemoryDashboard;
