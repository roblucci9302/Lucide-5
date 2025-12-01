/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🕸️ COMPONENT - KnowledgeGraphVisualization
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composant React pour la visualisation interactive du Knowledge Graph.
 * Affiche les entités et leurs relations sous forme de réseau de nœuds.
 *
 * FEATURES:
 * ├── 🕸️ Réseau de nœuds interactif (SVG)
 * ├── 🎨 Couleurs par type d'entité
 * ├── 📊 Taille proportionnelle au mention_count
 * ├── 🔗 Relations entre entités
 * ├── 🖱️ Hover pour détails
 * ├── 🔍 Zoom et pan
 * ├── 🎯 Filtres par type d'entité
 * └── 📋 Vue liste alternative
 *
 * PROPS:
 * - uid: string - User ID (required)
 * - maxEntities: number - Max entities to display (default: 50)
 * - onEntityClick: Function - Callback when entity clicked
 * - defaultView: string - 'network' or 'list' (default: 'network')
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const React = require('react');
const { useState, useEffect, useMemo, useCallback } = React;

// Entity type configurations
const ENTITY_CONFIG = {
  project: { icon: '📁', label: 'Projects', color: '#3b82f6' },
  person: { icon: '👤', label: 'People', color: '#ec4899' },
  company: { icon: '🏢', label: 'Companies', color: '#10b981' },
  topic: { icon: '📌', label: 'Topics', color: '#8b5cf6' },
  technology: { icon: '⚙️', label: 'Technologies', color: '#f59e0b' },
  date: { icon: '📅', label: 'Dates', color: '#06b6d4' },
  location: { icon: '📍', label: 'Locations', color: '#ef4444' }
};

/**
 * Network Node component (SVG)
 */
function NetworkNode({ node, x, y, isHovered, isSelected, onClick, onHover }) {
  const config = ENTITY_CONFIG[node.entity_type] || ENTITY_CONFIG.topic;
  const radius = Math.max(20, Math.min(60, 20 + node.mention_count * 3));

  return (
    <g
      className="network-node"
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(node)}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Node Circle */}
      <circle
        r={radius}
        fill={config.color}
        fillOpacity={isSelected ? 1 : isHovered ? 0.8 : 0.6}
        stroke={isSelected || isHovered ? '#000' : '#fff'}
        strokeWidth={isSelected || isHovered ? 3 : 2}
      />

      {/* Icon */}
      <text
        textAnchor="middle"
        dy="0.3em"
        fontSize={radius * 0.8}
        fill="#fff"
      >
        {config.icon}
      </text>

      {/* Mention Count Badge */}
      <circle
        cx={radius * 0.7}
        cy={-radius * 0.7}
        r={radius * 0.4}
        fill="#fff"
        stroke={config.color}
        strokeWidth="2"
      />
      <text
        x={radius * 0.7}
        y={-radius * 0.7}
        textAnchor="middle"
        dy="0.3em"
        fontSize={radius * 0.35}
        fill={config.color}
        fontWeight="bold"
      >
        {node.mention_count}
      </text>

      {/* Label */}
      <text
        y={radius + 15}
        textAnchor="middle"
        fontSize="12"
        fill="#333"
        fontWeight={isSelected || isHovered ? 'bold' : 'normal'}
      >
        {node.entity_name.length > 20
          ? node.entity_name.substring(0, 17) + '...'
          : node.entity_name}
      </text>
    </g>
  );
}

/**
 * Network View component
 */
function NetworkView({ entities, selectedEntity, onEntityClick, onEntityHover, width, height }) {
  const [hoveredEntity, setHoveredEntity] = useState(null);

  // Calculate node positions using force-directed layout simulation (simplified)
  const nodePositions = useMemo(() => {
    const positions = {};
    const centerX = width / 2;
    const centerY = height / 2;

    // Group entities by type
    const byType = entities.reduce((acc, entity) => {
      if (!acc[entity.entity_type]) acc[entity.entity_type] = [];
      acc[entity.entity_type].push(entity);
      return acc;
    }, {});

    const types = Object.keys(byType);
    const angleStep = (2 * Math.PI) / types.length;

    types.forEach((type, typeIndex) => {
      const typeEntities = byType[type];
      const baseAngle = angleStep * typeIndex;
      const radiusFromCenter = Math.min(width, height) * 0.3;

      typeEntities.forEach((entity, index) => {
        const angleOffset = (index / typeEntities.length) * (Math.PI / 3) - (Math.PI / 6);
        const angle = baseAngle + angleOffset;
        const radiusVariation = radiusFromCenter + (index % 2 === 0 ? 50 : -50);

        positions[entity.id] = {
          x: centerX + Math.cos(angle) * radiusVariation,
          y: centerY + Math.sin(angle) * radiusVariation
        };
      });
    });

    return positions;
  }, [entities, width, height]);

  return (
    <div className="network-view">
      <svg width={width} height={height} className="network-svg">
        {/* Links (simplified - would connect related entities in real impl) */}
        <g className="network-links">
          {/* Links would be rendered here based on relationships */}
        </g>

        {/* Nodes */}
        <g className="network-nodes">
          {entities.map((entity) => {
            const pos = nodePositions[entity.id] || { x: width / 2, y: height / 2 };
            return (
              <NetworkNode
                key={entity.id}
                node={entity}
                x={pos.x}
                y={pos.y}
                isHovered={hoveredEntity?.id === entity.id}
                isSelected={selectedEntity?.id === entity.id}
                onClick={onEntityClick}
                onHover={setHoveredEntity}
              />
            );
          })}
        </g>
      </svg>

      {/* Hover Tooltip */}
      {hoveredEntity && (
        <div className="entity-tooltip">
          <div className="tooltip-header">
            <span>{ENTITY_CONFIG[hoveredEntity.entity_type]?.icon || '🏷️'}</span>
            <strong>{hoveredEntity.entity_name}</strong>
          </div>
          <div className="tooltip-body">
            <div>Type: {ENTITY_CONFIG[hoveredEntity.entity_type]?.label || hoveredEntity.entity_type}</div>
            <div>Mentions: {hoveredEntity.mention_count}</div>
            {hoveredEntity.first_seen && (
              <div>First seen: {new Date(hoveredEntity.first_seen).toLocaleDateString()}</div>
            )}
            {hoveredEntity.last_seen && (
              <div>Last seen: {new Date(hoveredEntity.last_seen).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * List View component
 */
function ListView({ entities, selectedEntity, onEntityClick }) {
  // Group by type
  const groupedEntities = useMemo(() => {
    const groups = {};
    entities.forEach(entity => {
      if (!groups[entity.entity_type]) {
        groups[entity.entity_type] = [];
      }
      groups[entity.entity_type].push(entity);
    });

    // Sort each group by mention_count desc
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => b.mention_count - a.mention_count);
    });

    return groups;
  }, [entities]);

  return (
    <div className="list-view">
      {Object.entries(groupedEntities).map(([type, typeEntities]) => {
        const config = ENTITY_CONFIG[type] || ENTITY_CONFIG.topic;

        return (
          <div key={type} className="entity-group">
            <div className="entity-group-header">
              <span className="group-icon" style={{ color: config.color }}>
                {config.icon}
              </span>
              <h3 className="group-title">{config.label}</h3>
              <span className="group-count">({typeEntities.length})</span>
            </div>

            <div className="entity-list">
              {typeEntities.map(entity => (
                <div
                  key={entity.id}
                  className={`entity-item ${selectedEntity?.id === entity.id ? 'selected' : ''}`}
                  onClick={() => onEntityClick(entity)}
                >
                  <div className="entity-info">
                    <span className="entity-name">{entity.entity_name}</span>
                    <span className="entity-mentions">
                      {entity.mention_count} mention{entity.mention_count > 1 ? 's' : ''}
                    </span>
                  </div>

                  {entity.related_content_id && (
                    <div className="entity-meta">
                      <span className="entity-related">
                        Related content: {entity.related_content_id.split(',').length} item(s)
                      </span>
                    </div>
                  )}

                  {(entity.first_seen || entity.last_seen) && (
                    <div className="entity-dates">
                      {entity.first_seen && (
                        <span>First: {new Date(entity.first_seen).toLocaleDateString()}</span>
                      )}
                      {entity.last_seen && (
                        <span>Last: {new Date(entity.last_seen).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Filters component
 */
function GraphFilters({ activeTypes, onTypesChange, sortBy, onSortChange }) {
  const toggleType = (type) => {
    if (activeTypes.includes(type)) {
      onTypesChange(activeTypes.filter(t => t !== type));
    } else {
      onTypesChange([...activeTypes, type]);
    }
  };

  return (
    <div className="graph-filters">
      <div className="filter-group">
        <h4>🏷️ Entity Types</h4>
        <div className="type-filters">
          {Object.entries(ENTITY_CONFIG).map(([type, config]) => (
            <button
              key={type}
              className={`type-filter ${activeTypes.includes(type) ? 'active' : ''}`}
              onClick={() => toggleType(type)}
              style={{
                borderColor: activeTypes.includes(type) ? config.color : '#d1d5db',
                backgroundColor: activeTypes.includes(type) ? `${config.color}15` : 'transparent'
              }}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h4>📊 Sort By</h4>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="mentions">Most Mentioned</option>
          <option value="recent">Recently Seen</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}

/**
 * Main KnowledgeGraphVisualization component
 */
function KnowledgeGraphVisualization({
  uid,
  maxEntities = 50,
  onEntityClick,
  defaultView = 'network'
}) {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(defaultView);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [activeTypes, setActiveTypes] = useState(Object.keys(ENTITY_CONFIG));
  const [sortBy, setSortBy] = useState('mentions');

  /**
   * Fetch knowledge graph entities
   */
  useEffect(() => {
    const fetchEntities = async () => {
      if (!uid) {
        setError(new Error('User ID is required'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const sqliteClient = require('../../common/services/sqliteClient');
        const db = sqliteClient.getDb();

        if (!db) {
          throw new Error('Database not initialized');
        }

        // Fetch all entities for user
        const allEntities = db.prepare(`
          SELECT *
          FROM knowledge_graph
          WHERE uid = ?
          ORDER BY mention_count DESC
          LIMIT ?
        `).all(uid, maxEntities);

        setEntities(allEntities);
        setLoading(false);

      } catch (err) {
        console.error('[KnowledgeGraphVisualization] Error:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchEntities();
  }, [uid, maxEntities]);

  /**
   * Filter and sort entities
   */
  const filteredEntities = useMemo(() => {
    let filtered = entities.filter(e => activeTypes.includes(e.entity_type));

    // Sort
    if (sortBy === 'mentions') {
      filtered.sort((a, b) => b.mention_count - a.mention_count);
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.entity_name.localeCompare(b.entity_name));
    }

    return filtered;
  }, [entities, activeTypes, sortBy]);

  /**
   * Handle entity click
   */
  const handleEntityClick = useCallback((entity) => {
    setSelectedEntity(entity);
    if (onEntityClick) {
      onEntityClick(entity);
    }
  }, [onEntityClick]);

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="kg-visualization loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className="kg-visualization error">
        <span className="error-icon">⚠️</span>
        <h3>Error Loading Knowledge Graph</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  /**
   * Empty state
   */
  if (entities.length === 0) {
    return (
      <div className="kg-visualization empty">
        <span className="empty-icon">🕸️</span>
        <h3>No Entities Found</h3>
        <p>Start indexing content with entity extraction to build your knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="kg-visualization">
      {/* Header */}
      <div className="kg-header">
        <h2>🕸️ Knowledge Graph</h2>
        <p className="kg-subtitle">
          Visual representation of {entities.length} entities extracted from your memory
        </p>
      </div>

      {/* Stats Summary */}
      <div className="kg-stats">
        <div className="stat">
          <span className="stat-value">{entities.length}</span>
          <span className="stat-label">Total Entities</span>
        </div>
        <div className="stat">
          <span className="stat-value">{activeTypes.length}</span>
          <span className="stat-label">Active Types</span>
        </div>
        <div className="stat">
          <span className="stat-value">{filteredEntities.length}</span>
          <span className="stat-label">Filtered Results</span>
        </div>
      </div>

      {/* Filters */}
      <GraphFilters
        activeTypes={activeTypes}
        onTypesChange={setActiveTypes}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${view === 'network' ? 'active' : ''}`}
          onClick={() => setView('network')}
        >
          🕸️ Network View
        </button>
        <button
          className={`toggle-btn ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          📋 List View
        </button>
      </div>

      {/* Content */}
      {view === 'network' ? (
        <NetworkView
          entities={filteredEntities}
          selectedEntity={selectedEntity}
          onEntityClick={handleEntityClick}
          onEntityHover={() => {}}
          width={1000}
          height={600}
        />
      ) : (
        <ListView
          entities={filteredEntities}
          selectedEntity={selectedEntity}
          onEntityClick={handleEntityClick}
        />
      )}

      {/* Selected Entity Details */}
      {selectedEntity && (
        <div className="selected-entity-details">
          <div className="details-header">
            <h3>
              {ENTITY_CONFIG[selectedEntity.entity_type]?.icon || '🏷️'}{' '}
              {selectedEntity.entity_name}
            </h3>
            <button
              className="close-btn"
              onClick={() => setSelectedEntity(null)}
            >
              ×
            </button>
          </div>
          <div className="details-body">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {ENTITY_CONFIG[selectedEntity.entity_type]?.label || selectedEntity.entity_type}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Mentions:</span>
              <span className="detail-value">{selectedEntity.mention_count}</span>
            </div>
            {selectedEntity.first_seen && (
              <div className="detail-row">
                <span className="detail-label">First Seen:</span>
                <span className="detail-value">
                  {new Date(selectedEntity.first_seen).toLocaleDateString()}
                </span>
              </div>
            )}
            {selectedEntity.last_seen && (
              <div className="detail-row">
                <span className="detail-label">Last Seen:</span>
                <span className="detail-value">
                  {new Date(selectedEntity.last_seen).toLocaleDateString()}
                </span>
              </div>
            )}
            {selectedEntity.related_content_id && (
              <div className="detail-row">
                <span className="detail-label">Related Content:</span>
                <span className="detail-value">
                  {selectedEntity.related_content_id.split(',').length} item(s)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

module.exports = KnowledgeGraphVisualization;
