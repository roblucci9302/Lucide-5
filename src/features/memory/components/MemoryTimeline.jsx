/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ COMPONENT - MemoryTimeline
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composant React pour afficher une timeline interactive des contenus indexés
 * dans la mémoire augmentée.
 *
 * FEATURES:
 * ├── 📅 Timeline chronologique des items indexés
 * ├── 🎨 Visualisation par type de source
 * ├── 🔍 Filtrage par type de source
 * ├── 📊 Graphique à barres empilées
 * ├── 🖱️ Interaction hover pour détails
 * └── 📈 Tendances sur la période
 *
 * PROPS:
 * - timeline: Array - Données timeline depuis useMemoryStats
 * - onDateClick: Function - Callback quand une date est cliquée
 * - maxDays: number - Nombre maximum de jours à afficher (default: 30)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const React = require('react');
const { useState, useMemo } = React;

/**
 * Source type colors
 */
const SOURCE_COLORS = {
  conversation: '#3b82f6',    // blue
  screenshot: '#8b5cf6',      // purple
  audio: '#ec4899',           // pink
  external_database: '#10b981' // green
};

/**
 * Source type names
 */
const SOURCE_NAMES = {
  conversation: 'Conversations',
  screenshot: 'Screenshots',
  audio: 'Audio',
  external_database: 'External'
};

/**
 * Source type icons
 */
const SOURCE_ICONS = {
  conversation: '💬',
  screenshot: '📸',
  audio: '🎤',
  external_database: '🔗'
};

/**
 * Timeline Bar component
 */
function TimelineBar({ date, data, maxHeight, onHover, isHovered }) {
  const totalHeight = data.total > 0 ? (data.total / maxHeight) * 100 : 0;

  return (
    <div
      className={`timeline-bar ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => onHover(date)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="timeline-bar-stack" style={{ height: `${totalHeight}%` }}>
        {Object.entries(data.byType).map(([type, count]) => {
          const percentage = data.total > 0 ? (count / data.total) * 100 : 0;
          return (
            <div
              key={type}
              className="timeline-bar-segment"
              style={{
                height: `${percentage}%`,
                backgroundColor: SOURCE_COLORS[type] || '#6b7280'
              }}
              title={`${SOURCE_NAMES[type]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="timeline-bar-label">
        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

/**
 * Timeline Tooltip component
 */
function TimelineTooltip({ date, data }) {
  if (!date || !data) return null;

  return (
    <div className="timeline-tooltip">
      <div className="timeline-tooltip-header">
        <strong>{new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</strong>
      </div>
      <div className="timeline-tooltip-body">
        <div className="timeline-tooltip-total">
          Total: <strong>{data.total}</strong> items
        </div>
        <div className="timeline-tooltip-breakdown">
          {Object.entries(data.byType).map(([type, count]) => (
            <div key={type} className="timeline-tooltip-item">
              <span style={{ color: SOURCE_COLORS[type] }}>
                {SOURCE_ICONS[type]} {SOURCE_NAMES[type]}:
              </span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Filter Button component
 */
function FilterButton({ type, label, icon, active, onClick, color }) {
  return (
    <button
      className={`filter-button ${active ? 'active' : ''}`}
      onClick={() => onClick(type)}
      style={{
        borderColor: active ? color : '#d1d5db',
        backgroundColor: active ? `${color}15` : 'transparent'
      }}
    >
      <span className="filter-icon">{icon}</span>
      <span className="filter-label">{label}</span>
    </button>
  );
}

/**
 * Main MemoryTimeline component
 */
function MemoryTimeline({ timeline, onDateClick, maxDays = 30 }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set(['conversation', 'screenshot', 'audio', 'external_database']));

  /**
   * Toggle filter
   */
  const toggleFilter = (type) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  /**
   * Filter and process timeline data
   */
  const processedTimeline = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];

    // Limit to maxDays
    const limited = timeline.slice(0, maxDays);

    // Apply filters
    return limited.map(item => {
      const filteredByType = {};
      let filteredTotal = 0;

      Object.entries(item.byType).forEach(([type, count]) => {
        if (activeFilters.has(type)) {
          filteredByType[type] = count;
          filteredTotal += count;
        }
      });

      return {
        ...item,
        byType: filteredByType,
        total: filteredTotal
      };
    });
  }, [timeline, maxDays, activeFilters]);

  /**
   * Calculate max value for scaling
   */
  const maxValue = useMemo(() => {
    if (processedTimeline.length === 0) return 1;
    return Math.max(...processedTimeline.map(item => item.total), 1);
  }, [processedTimeline]);

  /**
   * Calculate statistics
   */
  const statistics = useMemo(() => {
    if (processedTimeline.length === 0) {
      return {
        totalItems: 0,
        avgPerDay: 0,
        peakDay: null,
        peakDayCount: 0
      };
    }

    const totalItems = processedTimeline.reduce((sum, item) => sum + item.total, 0);
    const avgPerDay = (totalItems / processedTimeline.length).toFixed(1);
    const peakDay = processedTimeline.reduce((max, item) =>
      item.total > max.total ? item : max,
    processedTimeline[0]);

    return {
      totalItems,
      avgPerDay,
      peakDay: peakDay.date,
      peakDayCount: peakDay.total
    };
  }, [processedTimeline]);

  /**
   * Get hovered item data
   */
  const hoveredData = useMemo(() => {
    if (!hoveredDate) return null;
    return processedTimeline.find(item => item.date === hoveredDate) || null;
  }, [hoveredDate, processedTimeline]);

  /**
   * Empty state
   */
  if (!timeline || timeline.length === 0) {
    return (
      <div className="memory-timeline empty">
        <div className="timeline-empty-state">
          <span className="timeline-empty-icon">📅</span>
          <h3>No Timeline Data</h3>
          <p>Start indexing content to see your memory timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-timeline">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}
      <div className="timeline-header">
        <div className="timeline-title">
          <h3>⏱️ Memory Timeline</h3>
          <p className="timeline-subtitle">
            Indexing activity over the last {processedTimeline.length} days
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* STATISTICS SUMMARY */}
      {/* ========================================================= */}
      <div className="timeline-stats-summary">
        <div className="timeline-stat">
          <span className="timeline-stat-label">Total Items</span>
          <span className="timeline-stat-value">{statistics.totalItems}</span>
        </div>
        <div className="timeline-stat">
          <span className="timeline-stat-label">Avg per Day</span>
          <span className="timeline-stat-value">{statistics.avgPerDay}</span>
        </div>
        <div className="timeline-stat">
          <span className="timeline-stat-label">Peak Day</span>
          <span className="timeline-stat-value">
            {statistics.peakDay ? (
              <>
                {new Date(statistics.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' '}({statistics.peakDayCount})
              </>
            ) : '-'}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FILTERS */}
      {/* ========================================================= */}
      <div className="timeline-filters">
        <span className="filters-label">Filter by source:</span>
        <div className="filters-buttons">
          {Object.entries(SOURCE_NAMES).map(([type, name]) => (
            <FilterButton
              key={type}
              type={type}
              label={name}
              icon={SOURCE_ICONS[type]}
              active={activeFilters.has(type)}
              onClick={toggleFilter}
              color={SOURCE_COLORS[type]}
            />
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TIMELINE CHART */}
      {/* ========================================================= */}
      <div className="timeline-chart">
        <div className="timeline-chart-container">
          {processedTimeline.map((item) => (
            <TimelineBar
              key={item.date}
              date={item.date}
              data={item}
              maxHeight={maxValue}
              onHover={setHoveredDate}
              isHovered={hoveredDate === item.date}
            />
          ))}
        </div>

        {/* Tooltip */}
        {hoveredData && (
          <TimelineTooltip
            date={hoveredDate}
            data={hoveredData}
          />
        )}
      </div>

      {/* ========================================================= */}
      {/* LEGEND */}
      {/* ========================================================= */}
      <div className="timeline-legend">
        <span className="legend-title">Sources:</span>
        {Object.entries(SOURCE_NAMES).map(([type, name]) => (
          <div key={type} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: SOURCE_COLORS[type] }}
            />
            <span className="legend-label">
              {SOURCE_ICONS[type]} {name}
            </span>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}
      {processedTimeline.length > 0 && (
        <div className="timeline-footer">
          <p className="timeline-period">
            Showing data from{' '}
            <strong>
              {new Date(processedTimeline[processedTimeline.length - 1].date).toLocaleDateString()}
            </strong>
            {' '}to{' '}
            <strong>
              {new Date(processedTimeline[0].date).toLocaleDateString()}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}

module.exports = MemoryTimeline;
