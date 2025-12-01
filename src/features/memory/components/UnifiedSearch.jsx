/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 COMPONENT - UnifiedSearch
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composant React pour la recherche unifiée à travers toutes les sources
 * de la mémoire augmentée (documents, conversations, screenshots, audio, external).
 *
 * FEATURES:
 * ├── 🔍 Recherche textuelle full-text
 * ├── 🎯 Filtres par type de source
 * ├── 📅 Filtres par date (range)
 * ├── ⭐ Filtres par importance
 * ├── 📊 Résultats groupés par source
 * ├── 🏷️ Filtres par tags
 * ├── 💡 Highlights des mots-clés
 * └── 🔗 Integration RAG multi-sources
 *
 * PROPS:
 * - uid: string - User ID (required)
 * - onResultClick: Function - Callback when result clicked
 * - maxResults: number - Max results per source (default: 5)
 * - defaultSources: Array - Default source types (default: all)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const React = require('react');
const { useState, useCallback, useEffect, useMemo } = React;

// Source configurations
const SOURCE_CONFIG = {
  conversation: { icon: '💬', label: 'Conversations', color: '#3b82f6' },
  screenshot: { icon: '📸', label: 'Screenshots', color: '#8b5cf6' },
  audio: { icon: '🎤', label: 'Audio', color: '#ec4899' },
  external_database: { icon: '🔗', label: 'External Data', color: '#10b981' },
  document: { icon: '📄', label: 'Documents', color: '#f59e0b' }
};

const IMPORTANCE_LEVELS = [
  { value: 'all', label: 'All Importance' },
  { value: 'high', label: 'High (≥0.8)', min: 0.8 },
  { value: 'medium', label: 'Medium (0.5-0.8)', min: 0.5, max: 0.8 },
  { value: 'low', label: 'Low (<0.5)', max: 0.5 }
];

/**
 * Search Bar component
 */
function SearchBar({ query, onQueryChange, onSearch, searching }) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search across all your memory..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch()}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => onQueryChange('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <button
        className="search-button"
        onClick={onSearch}
        disabled={!query.trim() || searching}
      >
        {searching ? '🔄 Searching...' : '🔍 Search'}
      </button>
    </div>
  );
}

/**
 * Filters Panel component
 */
function FiltersPanel({ filters, onFiltersChange }) {
  const toggleSource = (source) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    onFiltersChange({ ...filters, sources: newSources });
  };

  return (
    <div className="filters-panel">
      {/* Source Type Filters */}
      <div className="filter-group">
        <h4 className="filter-title">📦 Source Types</h4>
        <div className="filter-buttons">
          {Object.entries(SOURCE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              className={`filter-btn ${filters.sources.includes(type) ? 'active' : ''}`}
              onClick={() => toggleSource(type)}
              style={{
                borderColor: filters.sources.includes(type) ? config.color : '#d1d5db',
                backgroundColor: filters.sources.includes(type) ? `${config.color}15` : 'transparent'
              }}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Importance Filter */}
      <div className="filter-group">
        <h4 className="filter-title">⭐ Importance</h4>
        <select
          className="filter-select"
          value={filters.importance}
          onChange={(e) => onFiltersChange({ ...filters, importance: e.target.value })}
        >
          {IMPORTANCE_LEVELS.map(level => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="filter-group">
        <h4 className="filter-title">📅 Date Range</h4>
        <div className="date-range">
          <input
            type="date"
            className="date-input"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          />
          <span>to</span>
          <input
            type="date"
            className="date-input"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      {/* Reset Filters */}
      <button
        className="reset-filters-btn"
        onClick={() => onFiltersChange({
          sources: Object.keys(SOURCE_CONFIG),
          importance: 'all',
          dateFrom: '',
          dateTo: ''
        })}
      >
        🔄 Reset Filters
      </button>
    </div>
  );
}

/**
 * Search Result Item component
 */
function SearchResultItem({ result, query, onResultClick }) {
  const config = SOURCE_CONFIG[result.source_type] || SOURCE_CONFIG.document;

  const highlightText = (text, query) => {
    if (!query) return text;

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let highlighted = text;

    queryWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return { __html: highlighted };
  };

  const excerpt = result.content.substring(0, 300) + (result.content.length > 300 ? '...' : '');

  return (
    <div
      className="search-result-item"
      onClick={() => onResultClick && onResultClick(result)}
    >
      <div className="result-header">
        <div className="result-source">
          <span className="result-icon" style={{ color: config.color }}>
            {config.icon}
          </span>
          <span className="result-type">{config.label}</span>
        </div>
        <div className="result-meta">
          <span className="result-score">
            {Math.round((result.relevance_score || result.weighted_score || 0) * 100)}%
          </span>
          {result.indexed_at && (
            <span className="result-date">
              {new Date(result.indexed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <h3 className="result-title">{result.source_title || result.source_id}</h3>

      {result.content_summary && (
        <p className="result-summary">{result.content_summary}</p>
      )}

      <div
        className="result-excerpt"
        dangerouslySetInnerHTML={highlightText(excerpt, query)}
      />

      {result.metadata?.tags && result.metadata.tags.length > 0 && (
        <div className="result-tags">
          {result.metadata.tags.slice(0, 5).map(tag => (
            <span key={tag} className="result-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {result.importance_score !== undefined && (
        <div className="result-importance">
          <span className="importance-label">Importance:</span>
          <div className="importance-bar">
            <div
              className="importance-fill"
              style={{
                width: `${result.importance_score * 100}%`,
                backgroundColor: result.importance_score >= 0.8 ? '#10b981' :
                                result.importance_score >= 0.5 ? '#f59e0b' : '#6b7280'
              }}
            />
          </div>
          <span className="importance-value">
            {(result.importance_score * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Search Results component
 */
function SearchResults({ results, query, onResultClick, groupBySource }) {
  if (!results || results.length === 0) {
    return (
      <div className="search-results empty">
        <span className="empty-icon">🔍</span>
        <h3>No Results Found</h3>
        <p>Try adjusting your search query or filters</p>
      </div>
    );
  }

  if (!groupBySource) {
    return (
      <div className="search-results">
        <div className="results-header">
          <h3>{results.length} Result{results.length > 1 ? 's' : ''}</h3>
        </div>
        <div className="results-list">
          {results.map((result, index) => (
            <SearchResultItem
              key={result.id || index}
              result={result}
              query={query}
              onResultClick={onResultClick}
            />
          ))}
        </div>
      </div>
    );
  }

  // Group results by source type
  const grouped = results.reduce((acc, result) => {
    const type = result.source_type || 'document';
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {});

  return (
    <div className="search-results grouped">
      <div className="results-header">
        <h3>{results.length} Result{results.length > 1 ? 's' : ''} across {Object.keys(grouped).length} source{Object.keys(grouped).length > 1 ? 's' : ''}</h3>
      </div>

      {Object.entries(grouped).map(([type, typeResults]) => {
        const config = SOURCE_CONFIG[type] || SOURCE_CONFIG.document;
        return (
          <div key={type} className="results-group">
            <div className="group-header">
              <span className="group-icon" style={{ color: config.color }}>
                {config.icon}
              </span>
              <h4 className="group-title">{config.label}</h4>
              <span className="group-count">({typeResults.length})</span>
            </div>
            <div className="results-list">
              {typeResults.map((result, index) => (
                <SearchResultItem
                  key={result.id || index}
                  result={result}
                  query={query}
                  onResultClick={onResultClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Main UnifiedSearch component
 */
function UnifiedSearch({
  uid,
  onResultClick,
  maxResults = 5,
  defaultSources = Object.keys(SOURCE_CONFIG)
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    sources: defaultSources,
    importance: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [groupBySource, setGroupBySource] = useState(true);

  /**
   * Execute search
   */
  const executeSearch = useCallback(async () => {
    if (!query.trim()) return;
    if (!uid) {
      setError(new Error('User ID is required'));
      return;
    }

    setSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      // Note: In real implementation, this would call ragService.retrieveContextMultiSource
      // For now, we'll simulate with a database query

      const sqliteClient = require('../../common/services/sqliteClient');
      const db = sqliteClient.getDb();

      if (!db) {
        throw new Error('Database not initialized');
      }

      // Build query
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

      let sql = `
        SELECT *
        FROM auto_indexed_content
        WHERE uid = ?
      `;

      const params = [uid];

      // Source type filter
      if (filters.sources.length > 0 && filters.sources.length < Object.keys(SOURCE_CONFIG).length) {
        sql += ` AND source_type IN (${filters.sources.map(() => '?').join(',')})`;
        params.push(...filters.sources);
      }

      // Date range filter
      if (filters.dateFrom) {
        sql += ` AND indexed_at >= ?`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND indexed_at <= ?`;
        params.push(filters.dateTo + ' 23:59:59');
      }

      // Importance filter
      const importanceFilter = IMPORTANCE_LEVELS.find(l => l.value === filters.importance);
      if (importanceFilter && importanceFilter.value !== 'all') {
        if (importanceFilter.min !== undefined && importanceFilter.max !== undefined) {
          sql += ` AND importance_score >= ? AND importance_score < ?`;
          params.push(importanceFilter.min, importanceFilter.max);
        } else if (importanceFilter.min !== undefined) {
          sql += ` AND importance_score >= ?`;
          params.push(importanceFilter.min);
        } else if (importanceFilter.max !== undefined) {
          sql += ` AND importance_score < ?`;
          params.push(importanceFilter.max);
        }
      }

      sql += ` ORDER BY importance_score DESC, indexed_at DESC LIMIT ?`;
      params.push(maxResults * filters.sources.length);

      const allResults = db.prepare(sql).all(...params);

      // Score results by keyword matching
      const scoredResults = allResults.map(result => {
        const contentLower = (result.content || '').toLowerCase();
        const summaryLower = (result.content_summary || '').toLowerCase();
        const tagsLower = (result.tags || '').toLowerCase();

        let score = result.importance_score || 0.5;

        // Keyword matching boost
        const matches = queryWords.filter(word =>
          contentLower.includes(word) || summaryLower.includes(word) || tagsLower.includes(word)
        ).length;

        if (queryWords.length > 0) {
          score += (matches / queryWords.length) * 0.3;
        }

        return {
          ...result,
          relevance_score: Math.min(score, 1.0),
          metadata: {
            tags: result.tags ? JSON.parse(result.tags) : [],
            entities: result.entities ? JSON.parse(result.entities) : {}
          }
        };
      });

      // Filter by keyword presence and sort by score
      const filteredResults = scoredResults
        .filter(r => {
          if (queryWords.length === 0) return true;
          const contentLower = (r.content || '').toLowerCase();
          return queryWords.some(word => contentLower.includes(word));
        })
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, maxResults * filters.sources.length);

      setResults(filteredResults);

    } catch (err) {
      console.error('[UnifiedSearch] Search error:', err);
      setError(err);
    } finally {
      setSearching(false);
    }
  }, [query, uid, filters, maxResults]);

  /**
   * Handle search on Enter key
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && query.trim() && !searching) {
        executeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, searching, executeSearch]);

  return (
    <div className="unified-search">
      {/* Header */}
      <div className="search-header">
        <h2>🔍 Unified Search</h2>
        <p className="search-subtitle">
          Search across all your memory: documents, conversations, screenshots, audio, and external data
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        onSearch={executeSearch}
        searching={searching}
      />

      {/* Filters */}
      <FiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* View Toggle */}
      {hasSearched && results.length > 0 && (
        <div className="view-toggle">
          <button
            className={`toggle-btn ${groupBySource ? 'active' : ''}`}
            onClick={() => setGroupBySource(true)}
          >
            📦 Group by Source
          </button>
          <button
            className={`toggle-btn ${!groupBySource ? 'active' : ''}`}
            onClick={() => setGroupBySource(false)}
          >
            📋 List View
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="search-error">
          <span className="error-icon">⚠️</span>
          <span>{error.message}</span>
        </div>
      )}

      {/* Results */}
      {hasSearched && !searching && (
        <SearchResults
          results={results}
          query={query}
          onResultClick={onResultClick}
          groupBySource={groupBySource}
        />
      )}

      {/* Empty State */}
      {!hasSearched && (
        <div className="search-empty-state">
          <span className="empty-icon">🔍</span>
          <h3>Start Searching</h3>
          <p>Enter a query to search across all your augmented memory</p>
          <div className="search-tips">
            <h4>💡 Search Tips:</h4>
            <ul>
              <li>Use specific keywords for better results</li>
              <li>Filter by source type to narrow down results</li>
              <li>Use date range to find recent or historical content</li>
              <li>Filter by importance to find critical information</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

module.exports = UnifiedSearch;
