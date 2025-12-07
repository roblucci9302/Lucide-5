/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 COMPONENT - SourceStats
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composant React pour afficher les statistiques par source de données
 * de la mémoire augmentée.
 *
 * FEATURES:
 * ├── 📈 Cartes statistiques par type de source
 * ├── 🎨 Graphiques visuels (bar charts)
 * ├── 🔥 Activité récente (7 derniers jours)
 * ├── 💾 Estimation de stockage
 * └── 🏷️ Top tags et distribution d'importance
 *
 * PROPS:
 * - stats: Object - Statistiques depuis useMemoryStats
 * - loading: boolean - État de chargement
 * - onRefresh: Function - Callback pour rafraîchir
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const React = require('react');
const { useMemo } = React;

/**
 * Icon component for source types
 */
function SourceIcon({ type }) {
  const icons = {
    conversation: '💬',
    screenshot: '📸',
    audio: '🎤',
    external_database: '🔗'
  };

  return <span className="source-icon">{icons[type] || '📄'}</span>;
}

/**
 * Stat Card component
 */
function StatCard({ icon, title, value, subtitle, trend, className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-header">
        <span className="stat-card-icon">{icon}</span>
        <h3 className="stat-card-title">{title}</h3>
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`stat-card-trend ${trend.direction}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Progress Bar component
 */
function ProgressBar({ label, value, max, color = '#3b82f6' }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span className="progress-bar-label">{label}</span>
        <span className="progress-bar-value">{value}</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
}

/**
 * Main SourceStats component
 */
function SourceStats({ stats, loading, onRefresh }) {
  /**
   * Calculate color for source type
   */
  const getSourceColor = (type) => {
    const colors = {
      conversation: '#3b82f6', // blue
      screenshot: '#8b5cf6',   // purple
      audio: '#ec4899',        // pink
      external_database: '#10b981' // green
    };
    return colors[type] || '#6b7280';
  };

  /**
   * Calculate source names
   */
  const getSourceName = (type) => {
    const names = {
      conversation: 'Conversations',
      screenshot: 'Screenshots',
      audio: 'Audio Files',
      external_database: 'External Sources'
    };
    return names[type] || type;
  };

  /**
   * Memoized calculations
   */
  const calculations = useMemo(() => {
    if (!stats) return null;

    const { global, recentActivity, importanceDistribution, storage, topTags } = stats;

    // Find most active source
    const sourceEntries = Object.entries(global.bySourceType);
    const mostActiveSource = sourceEntries.reduce((max, [type, count]) =>
      count > max.count ? { type, count } : max,
    { type: null, count: 0 });

    // Calculate recent activity percentage
    const recentPercentage = global.totalItems > 0
      ? ((recentActivity.totalLast7Days / global.totalItems) * 100).toFixed(1)
      : 0;

    // High importance percentage
    const highImportancePercentage = global.totalItems > 0
      ? ((importanceDistribution.high / global.totalItems) * 100).toFixed(1)
      : 0;

    return {
      mostActiveSource,
      recentPercentage,
      highImportancePercentage
    };
  }, [stats]);

  /**
   * Loading state
   */
  if (loading && !stats) {
    return (
      <div className="source-stats loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading memory statistics...</p>
        </div>
      </div>
    );
  }

  /**
   * Error state or no stats
   */
  if (!stats) {
    return (
      <div className="source-stats empty">
        <p>No statistics available</p>
        {onRefresh && (
          <button onClick={onRefresh} className="btn-refresh">
            Refresh
          </button>
        )}
      </div>
    );
  }

  const { global, recentActivity, importanceDistribution, storage, topTags, externalSources } = stats;

  return (
    <div className="source-stats">
      {/* ========================================================= */}
      {/* HEADER WITH REFRESH BUTTON */}
      {/* ========================================================= */}
      <div className="source-stats-header">
        <div className="source-stats-title">
          <h2>📊 Memory Statistics</h2>
          <p className="source-stats-subtitle">
            Overview of your augmented memory system
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-refresh"
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* KEY METRICS CARDS */}
      {/* ========================================================= */}
      <div className="stats-grid">
        <StatCard
          icon="📚"
          title="Total Items"
          value={global.totalItems.toLocaleString()}
          subtitle="Indexed in memory"
          className="stat-card-primary"
        />

        <StatCard
          icon="🔥"
          title="Recent Activity"
          value={recentActivity.totalLast7Days}
          subtitle="Last 7 days"
          trend={calculations.recentPercentage > 0 ? {
            direction: 'up',
            value: `${calculations.recentPercentage}% of total`
          } : null}
          className="stat-card-success"
        />

        <StatCard
          icon="⭐"
          title="High Importance"
          value={importanceDistribution.high}
          subtitle={`${calculations.highImportancePercentage}% of total`}
          className="stat-card-warning"
        />

        <StatCard
          icon="💾"
          title="Storage Used"
          value={`${storage.estimatedTotalMB} MB`}
          subtitle={`Avg: ${(storage.avgContentBytes / 1024).toFixed(1)} KB per item`}
          className="stat-card-info"
        />
      </div>

      {/* ========================================================= */}
      {/* SOURCE TYPE BREAKDOWN */}
      {/* ========================================================= */}
      <div className="stats-section">
        <h3 className="stats-section-title">📦 Sources Breakdown</h3>
        <div className="source-breakdown">
          {Object.entries(global.bySourceType).map(([type, count]) => (
            <ProgressBar
              key={type}
              label={
                <span>
                  <SourceIcon type={type} /> {getSourceName(type)}
                </span>
              }
              value={count}
              max={global.totalItems}
              color={getSourceColor(type)}
            />
          ))}
        </div>

        {calculations.mostActiveSource.type && (
          <div className="stat-highlight">
            <SourceIcon type={calculations.mostActiveSource.type} />
            <strong>{getSourceName(calculations.mostActiveSource.type)}</strong>
            {' '}is your most active source with{' '}
            <strong>{calculations.mostActiveSource.count}</strong> items
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* IMPORTANCE DISTRIBUTION */}
      {/* ========================================================= */}
      <div className="stats-section">
        <h3 className="stats-section-title">🎯 Importance Distribution</h3>
        <div className="importance-distribution">
          <div className="importance-bar">
            <div
              className="importance-segment high"
              style={{
                width: `${(importanceDistribution.high / global.totalItems) * 100}%`
              }}
              title={`High: ${importanceDistribution.high}`}
            >
              {importanceDistribution.high > 0 && (
                <span className="importance-label">
                  High ({importanceDistribution.high})
                </span>
              )}
            </div>
            <div
              className="importance-segment medium"
              style={{
                width: `${(importanceDistribution.medium / global.totalItems) * 100}%`
              }}
              title={`Medium: ${importanceDistribution.medium}`}
            >
              {importanceDistribution.medium > 0 && (
                <span className="importance-label">
                  Medium ({importanceDistribution.medium})
                </span>
              )}
            </div>
            <div
              className="importance-segment low"
              style={{
                width: `${(importanceDistribution.low / global.totalItems) * 100}%`
              }}
              title={`Low: ${importanceDistribution.low}`}
            >
              {importanceDistribution.low > 0 && (
                <span className="importance-label">
                  Low ({importanceDistribution.low})
                </span>
              )}
            </div>
          </div>
          <div className="importance-legend">
            <div className="legend-item">
              <span className="legend-color high"></span>
              <span>High (≥0.8)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color medium"></span>
              <span>Medium (0.5-0.8)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color low"></span>
              <span>Low (&lt;0.5)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TOP TAGS */}
      {/* ========================================================= */}
      {topTags && topTags.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">🏷️ Top Tags</h3>
          <div className="top-tags">
            {topTags.map(({ tag, count }) => (
              <div key={tag} className="tag-item">
                <span className="tag-name">{tag}</span>
                <span className="tag-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXTERNAL SOURCES */}
      {/* ========================================================= */}
      {externalSources && externalSources.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">🔗 External Sources</h3>
          <div className="external-sources-list">
            {externalSources.map((source) => (
              <div key={source.id} className="external-source-item">
                <div className="external-source-info">
                  <span className="external-source-name">{source.name}</span>
                  <span className="external-source-type">{source.type}</span>
                </div>
                <div className="external-source-status">
                  <span className={`status-badge ${source.active ? 'active' : 'inactive'}`}>
                    {source.active ? '✓ Active' : '○ Inactive'}
                  </span>
                  {source.lastSynced && (
                    <span className="last-synced">
                      Last synced: {new Date(source.lastSynced).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}
      <div className="source-stats-footer">
        <p className="last-updated">
          Last updated: {new Date(global.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

module.exports = SourceStats;
