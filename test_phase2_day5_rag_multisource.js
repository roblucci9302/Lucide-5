/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 TESTS COMPLETS - JOUR 5 - RAG MULTI-SOURCES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Suite de tests complète pour la fonctionnalité RAG Multi-Sources
 * Phase 2 - Jour 5 : Récupération de contexte depuis sources multiples
 *
 * FONCTIONNALITÉS TESTÉES:
 * ├── 1. retrieveContextMultiSource (récupération multi-sources)
 * ├── 2. _searchConversations (recherche conversations)
 * ├── 3. _searchScreenshots (recherche screenshots OCR)
 * ├── 4. _searchAudio (recherche transcriptions audio)
 * ├── 5. _searchExternal (recherche bases externes)
 * ├── 6. _applySourceWeighting (pondération par source)
 * ├── 7. buildEnrichedPromptMultiSource (prompt enrichi multi-sources)
 * ├── 8. _formatMultiSourceContext (formatage contexte)
 * └── 9. _formatRelatedEntities (formatage entités)
 *
 * ENVIRONNEMENT:
 * - Mock de sqliteClient pour simuler la base de données
 * - Mock de knowledgeOrganizerService pour les entités
 * - Mock de indexingService pour les documents
 * - Mock de embeddingProvider pour les embeddings
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const assert = require('assert');

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const mockDatabase = {
  autoIndexedContent: [
    // Conversations
    {
      id: 'conv-001',
      uid: 'user123',
      source_type: 'conversation',
      source_id: 'conv-2025-01-15',
      source_title: 'Discussion React Performance',
      content: 'We discussed React performance optimization techniques including useMemo, useCallback, and React.memo for preventing unnecessary re-renders.',
      content_summary: 'React performance optimization discussion',
      entities: JSON.stringify({ topics: ['React', 'Performance'], technologies: ['useMemo', 'useCallback'] }),
      tags: JSON.stringify(['react', 'performance', 'optimization']),
      importance_score: 0.8,
      indexed_at: '2025-01-15 10:30:00'
    },
    {
      id: 'conv-002',
      uid: 'user123',
      source_type: 'conversation',
      source_id: 'conv-2025-01-14',
      source_title: 'Database Schema Design',
      content: 'Conversation about designing a normalized database schema for the e-commerce platform with products, orders, and customers tables.',
      content_summary: 'E-commerce database schema design',
      entities: JSON.stringify({ topics: ['Database', 'Schema'], technologies: ['PostgreSQL'] }),
      tags: JSON.stringify(['database', 'schema', 'ecommerce']),
      importance_score: 0.7,
      indexed_at: '2025-01-14 14:20:00'
    },
    // Screenshots
    {
      id: 'screen-001',
      uid: 'user123',
      source_type: 'screenshot',
      source_id: 'screenshot-2025-01-15.png',
      source_title: 'Screenshot from 2025-01-15',
      content: 'Code snippet showing React component with performance issue. UseEffect running on every render without dependency array.',
      content_summary: 'React useEffect bug screenshot',
      entities: JSON.stringify({ topics: ['React', 'Bug'], technologies: ['useEffect'] }),
      tags: JSON.stringify(['react', 'bug', 'useEffect']),
      importance_score: 0.6,
      indexed_at: '2025-01-15 11:00:00'
    },
    // Audio
    {
      id: 'audio-001',
      uid: 'user123',
      source_type: 'audio',
      source_id: 'meeting-2025-01-13.mp3',
      source_title: 'Team Meeting January 13',
      content: 'SPEAKER_00: We need to optimize our database queries. SPEAKER_01: Yes, adding indexes on foreign keys would help. SPEAKER_00: Agreed, let\'s also implement query caching.',
      content_summary: 'Team meeting about database optimization',
      entities: JSON.stringify({ topics: ['Database', 'Optimization'], people: ['Team Lead', 'Developer'] }),
      tags: JSON.stringify(['meeting', 'database', 'optimization']),
      importance_score: 0.75,
      indexed_at: '2025-01-13 16:00:00'
    },
    // External database import
    {
      id: 'ext-001',
      uid: 'user123',
      source_type: 'external_database',
      source_id: 'ext-source-postgres-001',
      source_title: 'Customer Feedback - Product Quality',
      content: 'Customer feedback: The product quality is excellent but delivery time could be improved. Would recommend to others.',
      content_summary: 'Positive customer feedback with delivery concern',
      entities: JSON.stringify({ topics: ['Customer Feedback', 'Quality'], companies: ['Our Company'] }),
      tags: JSON.stringify(['feedback', 'quality', 'delivery']),
      importance_score: 0.65,
      indexed_at: '2025-01-12 09:00:00'
    }
  ],
  externalSources: [
    {
      id: 'ext-source-postgres-001',
      uid: 'user123',
      source_type: 'postgres',
      source_name: 'Production Database',
      description: 'Main production PostgreSQL database',
      connection_config: JSON.stringify({ host: 'localhost', port: 5432, database: 'production' }),
      credentials_encrypted: 0,
      is_active: 1,
      created_at: '2025-01-10 10:00:00',
      last_synced_at: '2025-01-12 09:00:00'
    }
  ]
};

const mockSqliteClient = {
  getDb: () => ({
    prepare: (query) => ({
      all: (...params) => {
        // Mock conversations query
        if (query.includes('source_type = \'conversation\'')) {
          return mockDatabase.autoIndexedContent.filter(c => c.source_type === 'conversation' && c.uid === params[0]);
        }
        // Mock screenshots query
        if (query.includes('source_type = \'screenshot\'')) {
          return mockDatabase.autoIndexedContent.filter(c => c.source_type === 'screenshot' && c.uid === params[0]);
        }
        // Mock audio query
        if (query.includes('source_type = \'audio\'')) {
          return mockDatabase.autoIndexedContent.filter(c => c.source_type === 'audio' && c.uid === params[0]);
        }
        // Mock external database query
        if (query.includes('source_type = \'external_database\'')) {
          return mockDatabase.autoIndexedContent.filter(c => c.source_type === 'external_database' && c.uid === params[0]);
        }
        // Mock external sources query
        if (query.includes('FROM external_sources')) {
          return mockDatabase.externalSources.filter(s => s.uid === params[0] && s.is_active === 1);
        }
        return [];
      },
      get: (...params) => {
        if (query.includes('FROM external_sources WHERE id = ?')) {
          return mockDatabase.externalSources.find(s => s.id === params[0]);
        }
        return null;
      }
    })
  })
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK KNOWLEDGE ORGANIZER SERVICE
// ═══════════════════════════════════════════════════════════════════════════

const mockKnowledgeOrganizerService = {
  detectEntitiesInQuery: async (query) => {
    const queryLower = query.toLowerCase();
    const entities = {
      projects: [],
      people: [],
      companies: [],
      topics: [],
      technologies: [],
      dates: [],
      locations: []
    };

    if (queryLower.includes('react')) {
      entities.technologies.push('React');
      entities.topics.push('Frontend Development');
    }
    if (queryLower.includes('performance')) {
      entities.topics.push('Performance Optimization');
    }
    if (queryLower.includes('database')) {
      entities.topics.push('Database Management');
    }

    return entities;
  },

  getKnowledgeGraphStats: async (uid) => {
    return {
      totalEntities: 15,
      byType: {
        projects: 3,
        people: 4,
        companies: 2,
        topics: 3,
        technologies: 2,
        dates: 1,
        locations: 0
      },
      topEntities: [
        { entity_type: 'technology', entity_name: 'React', mention_count: 5 },
        { entity_type: 'topic', entity_name: 'Performance Optimization', mention_count: 4 },
        { entity_type: 'topic', entity_name: 'Database Management', mention_count: 3 }
      ]
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK INDEXING SERVICE
// ═══════════════════════════════════════════════════════════════════════════

const mockIndexingService = {
  semanticSearch: async (query, options = {}) => {
    // Simulate document search results
    return [
      {
        id: 'doc-chunk-001',
        content: 'React performance best practices: Use React.memo for component memoization, useMemo for expensive calculations, and useCallback for function references.',
        relevance_score: 0.85,
        metadata: { source: 'react-guide.pdf', page: 12 }
      },
      {
        id: 'doc-chunk-002',
        content: 'Database indexing strategies: Create indexes on foreign key columns, composite indexes for multi-column queries, and partial indexes for filtered queries.',
        relevance_score: 0.78,
        metadata: { source: 'database-guide.pdf', page: 45 }
      }
    ];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK RAG SERVICE (with methods we're testing)
// ═══════════════════════════════════════════════════════════════════════════

class MockRAGService {
  constructor() {
    this.sqliteClient = mockSqliteClient;
    this.knowledgeOrganizerService = mockKnowledgeOrganizerService;
    this.indexingService = mockIndexingService;
    this.MAX_CONTEXT_TOKENS = 4000;
  }

  // Method: _searchConversations
  async _searchConversations(query, uid, options = {}) {
    const { limit = 5, minScore = 0.5 } = options;

    const db = this.sqliteClient.getDb();
    const conversations = db.prepare(`
      SELECT id, source_id, source_title, content, content_summary, entities, tags, importance_score, indexed_at
      FROM auto_indexed_content
      WHERE uid = ? AND source_type = 'conversation'
      ORDER BY importance_score DESC, indexed_at DESC
      LIMIT ?
    `).all(uid, limit * 2);

    // Score conversations based on keyword matching
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scoredConversations = conversations.map(conv => {
      const contentLower = (conv.content || '').toLowerCase();
      const summaryLower = (conv.content_summary || '').toLowerCase();
      const tagsLower = (conv.tags || '').toLowerCase();

      let score = conv.importance_score || 0.5;

      // Keyword matching boost
      const matches = queryWords.filter(word =>
        word.length > 3 && (contentLower.includes(word) || summaryLower.includes(word) || tagsLower.includes(word))
      ).length;

      if (queryWords.length > 0) {
        score += (matches / queryWords.length) * 0.3;
      }

      return {
        ...conv,
        relevance_score: Math.min(score, 1.0),
        source_type: 'conversation'
      };
    });

    // Filter by min score and sort
    const filteredConversations = scoredConversations
      .filter(c => c.relevance_score >= minScore)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);

    return filteredConversations.map(c => ({
      id: c.id,
      source_type: 'conversation',
      source_id: c.source_id,
      source_title: c.source_title,
      content: c.content,
      content_summary: c.content_summary,
      relevance_score: c.relevance_score,
      metadata: {
        entities: c.entities ? JSON.parse(c.entities) : {},
        tags: c.tags ? JSON.parse(c.tags) : [],
        indexed_at: c.indexed_at
      }
    }));
  }

  // Method: _searchScreenshots
  async _searchScreenshots(query, uid, options = {}) {
    const { limit = 3, minScore = 0.4 } = options;

    const db = this.sqliteClient.getDb();
    const screenshots = db.prepare(`
      SELECT id, source_id, source_title, content, content_summary, entities, tags, importance_score, indexed_at
      FROM auto_indexed_content
      WHERE uid = ? AND source_type = 'screenshot'
      ORDER BY importance_score DESC, indexed_at DESC
      LIMIT ?
    `).all(uid, limit * 2);

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scoredScreenshots = screenshots.map(screen => {
      const contentLower = (screen.content || '').toLowerCase();
      let score = (screen.importance_score || 0.4) * 0.8; // Lower base for screenshots

      const matches = queryWords.filter(word => word.length > 3 && contentLower.includes(word)).length;
      if (queryWords.length > 0) {
        score += (matches / queryWords.length) * 0.3;
      }

      return { ...screen, relevance_score: Math.min(score, 1.0), source_type: 'screenshot' };
    });

    return scoredScreenshots
      .filter(s => s.relevance_score >= minScore)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit)
      .map(s => ({
        id: s.id,
        source_type: 'screenshot',
        source_id: s.source_id,
        source_title: s.source_title,
        content: s.content,
        content_summary: s.content_summary,
        relevance_score: s.relevance_score,
        metadata: { entities: s.entities ? JSON.parse(s.entities) : {}, indexed_at: s.indexed_at }
      }));
  }

  // Method: _searchAudio
  async _searchAudio(query, uid, options = {}) {
    const { limit = 3, minScore = 0.5 } = options;

    const db = this.sqliteClient.getDb();
    const audioFiles = db.prepare(`
      SELECT id, source_id, source_title, content, content_summary, entities, tags, importance_score, indexed_at
      FROM auto_indexed_content
      WHERE uid = ? AND source_type = 'audio'
      ORDER BY importance_score DESC, indexed_at DESC
      LIMIT ?
    `).all(uid, limit * 2);

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scoredAudio = audioFiles.map(audio => {
      const contentLower = (audio.content || '').toLowerCase();
      const summaryLower = (audio.content_summary || '').toLowerCase();

      let score = audio.importance_score || 0.5;
      const matches = queryWords.filter(word =>
        word.length > 3 && (contentLower.includes(word) || summaryLower.includes(word))
      ).length;

      if (queryWords.length > 0) {
        score += (matches / queryWords.length) * 0.25;
      }

      return { ...audio, relevance_score: Math.min(score, 1.0), source_type: 'audio' };
    });

    return scoredAudio
      .filter(a => a.relevance_score >= minScore)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit)
      .map(a => ({
        id: a.id,
        source_type: 'audio',
        source_id: a.source_id,
        source_title: a.source_title,
        content: a.content,
        content_summary: a.content_summary,
        relevance_score: a.relevance_score,
        metadata: { entities: a.entities ? JSON.parse(a.entities) : {}, indexed_at: a.indexed_at }
      }));
  }

  // Method: _searchExternal
  async _searchExternal(query, uid, options = {}) {
    const { limit = 3, minScore = 0.5 } = options;

    const db = this.sqliteClient.getDb();
    const externalData = db.prepare(`
      SELECT id, source_id, source_title, content, content_summary, entities, tags, importance_score, indexed_at
      FROM auto_indexed_content
      WHERE uid = ? AND source_type = 'external_database'
      ORDER BY importance_score DESC, indexed_at DESC
      LIMIT ?
    `).all(uid, limit * 2);

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scoredExternal = externalData.map(ext => {
      const contentLower = (ext.content || '').toLowerCase();
      const summaryLower = (ext.content_summary || '').toLowerCase();

      let score = ext.importance_score || 0.6;
      const matches = queryWords.filter(word =>
        word.length > 3 && (contentLower.includes(word) || summaryLower.includes(word))
      ).length;

      if (queryWords.length > 0) {
        score += (matches / queryWords.length) * 0.3;
      }

      return { ...ext, relevance_score: Math.min(score, 1.0), source_type: 'external_database' };
    });

    return scoredExternal
      .filter(e => e.relevance_score >= minScore)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit)
      .map(e => ({
        id: e.id,
        source_type: 'external_database',
        source_id: e.source_id,
        source_title: e.source_title,
        content: e.content,
        content_summary: e.content_summary,
        relevance_score: e.relevance_score,
        metadata: { entities: e.entities ? JSON.parse(e.entities) : {}, indexed_at: e.indexed_at }
      }));
  }

  // Method: _applySourceWeighting
  _applySourceWeighting(chunks) {
    const weights = {
      document: 1.0,
      external_database: 0.9,
      conversation: 0.85,
      audio: 0.8,
      screenshot: 0.75
    };

    return chunks.map(chunk => ({
      ...chunk,
      weighted_score: (chunk.relevance_score || 0.7) * (weights[chunk.source_type] || 1.0)
    }));
  }

  // Method: retrieveContextMultiSource
  async retrieveContextMultiSource(query, uid, options = {}) {
    const {
      sources = ['documents', 'conversations', 'screenshots', 'audio', 'external'],
      maxChunks = 10,
      minScore = 0.5
    } = options;

    const results = {
      hasContext: false,
      chunks: [],
      sources: [],
      totalTokens: 0,
      sourceBreakdown: {
        documents: 0,
        conversations: 0,
        screenshots: 0,
        audio: 0,
        external: 0
      }
    };

    try {
      // 1. Search documents
      if (sources.includes('documents')) {
        const docChunks = await this.indexingService.semanticSearch(query, {
          limit: maxChunks,
          minScore
        });

        const formattedDocChunks = docChunks.map(chunk => ({
          ...chunk,
          source_type: 'document',
          source_title: chunk.metadata?.source || 'Document',
          content_summary: chunk.content.substring(0, 100) + '...'
        }));

        results.chunks.push(...formattedDocChunks);
        results.sourceBreakdown.documents = formattedDocChunks.length;
      }

      // 2. Search conversations
      if (sources.includes('conversations')) {
        const convChunks = await this._searchConversations(query, uid, {
          limit: Math.ceil(maxChunks / 2),
          minScore
        });
        results.chunks.push(...convChunks);
        results.sourceBreakdown.conversations = convChunks.length;
      }

      // 3. Search screenshots
      if (sources.includes('screenshots')) {
        const screenChunks = await this._searchScreenshots(query, uid, {
          limit: Math.ceil(maxChunks / 3),
          minScore: minScore * 0.8
        });
        results.chunks.push(...screenChunks);
        results.sourceBreakdown.screenshots = screenChunks.length;
      }

      // 4. Search audio
      if (sources.includes('audio')) {
        const audioChunks = await this._searchAudio(query, uid, {
          limit: Math.ceil(maxChunks / 3),
          minScore
        });
        results.chunks.push(...audioChunks);
        results.sourceBreakdown.audio = audioChunks.length;
      }

      // 5. Search external databases
      if (sources.includes('external')) {
        const externalChunks = await this._searchExternal(query, uid, {
          limit: Math.ceil(maxChunks / 3),
          minScore
        });
        results.chunks.push(...externalChunks);
        results.sourceBreakdown.external = externalChunks.length;
      }

      // Apply source weighting
      results.chunks = this._applySourceWeighting(results.chunks);

      // Sort by weighted score and limit
      results.chunks.sort((a, b) => (b.weighted_score || b.relevance_score) - (a.weighted_score || a.relevance_score));
      results.chunks = results.chunks.slice(0, maxChunks);

      // Build sources list
      results.sources = results.chunks.map(chunk => ({
        id: chunk.id,
        type: chunk.source_type,
        title: chunk.source_title,
        summary: chunk.content_summary,
        score: chunk.weighted_score || chunk.relevance_score
      }));

      results.hasContext = results.chunks.length > 0;
      results.totalTokens = this._estimateTokens(results.chunks);

      return results;

    } catch (error) {
      console.error('Error in retrieveContextMultiSource:', error);
      return results;
    }
  }

  // Method: _formatMultiSourceContext
  _formatMultiSourceContext(sources) {
    if (!sources || sources.length === 0) {
      return '';
    }

    let contextSection = '\n📚 RELEVANT CONTEXT FROM YOUR KNOWLEDGE BASE:\n\n';

    // Group sources by type
    const byType = {
      document: [],
      conversation: [],
      screenshot: [],
      audio: [],
      external_database: []
    };

    sources.forEach(source => {
      if (byType[source.type]) {
        byType[source.type].push(source);
      }
    });

    // Format each type
    if (byType.document.length > 0) {
      contextSection += '📄 Documents:\n';
      byType.document.forEach((s, i) => {
        contextSection += `  ${i + 1}. ${s.title} (relevance: ${(s.score * 100).toFixed(0)}%)\n`;
        contextSection += `     ${s.summary}\n`;
      });
      contextSection += '\n';
    }

    if (byType.conversation.length > 0) {
      contextSection += '💬 Past Conversations:\n';
      byType.conversation.forEach((s, i) => {
        contextSection += `  ${i + 1}. ${s.title} (relevance: ${(s.score * 100).toFixed(0)}%)\n`;
        contextSection += `     ${s.summary}\n`;
      });
      contextSection += '\n';
    }

    if (byType.screenshot.length > 0) {
      contextSection += '📸 Screenshots (OCR):\n';
      byType.screenshot.forEach((s, i) => {
        contextSection += `  ${i + 1}. ${s.title} (relevance: ${(s.score * 100).toFixed(0)}%)\n`;
        contextSection += `     ${s.summary}\n`;
      });
      contextSection += '\n';
    }

    if (byType.audio.length > 0) {
      contextSection += '🎤 Audio Transcriptions:\n';
      byType.audio.forEach((s, i) => {
        contextSection += `  ${i + 1}. ${s.title} (relevance: ${(s.score * 100).toFixed(0)}%)\n`;
        contextSection += `     ${s.summary}\n`;
      });
      contextSection += '\n';
    }

    if (byType.external_database.length > 0) {
      contextSection += '🔗 External Database Records:\n';
      byType.external_database.forEach((s, i) => {
        contextSection += `  ${i + 1}. ${s.title} (relevance: ${(s.score * 100).toFixed(0)}%)\n`;
        contextSection += `     ${s.summary}\n`;
      });
      contextSection += '\n';
    }

    return contextSection;
  }

  // Method: _formatRelatedEntities
  _formatRelatedEntities(kgStats, relatedEntities) {
    if (!kgStats || !kgStats.topEntities || kgStats.topEntities.length === 0) {
      return '';
    }

    let entitiesSection = '\n🔗 RELATED ENTITIES FROM YOUR KNOWLEDGE GRAPH:\n\n';

    const topEntities = kgStats.topEntities.slice(0, 5);
    topEntities.forEach(entity => {
      const icon = entity.entity_type === 'technology' ? '⚙️' :
                   entity.entity_type === 'topic' ? '📌' :
                   entity.entity_type === 'person' ? '👤' : '🏷️';
      entitiesSection += `${icon} ${entity.entity_name} (mentioned ${entity.mention_count} times)\n`;
    });

    return entitiesSection;
  }

  // Method: buildEnrichedPromptMultiSource
  async buildEnrichedPromptMultiSource(userQuery, basePrompt, contextData, uid) {
    try {
      // Detect entities in the query
      const relatedEntities = await this.knowledgeOrganizerService.detectEntitiesInQuery(userQuery);

      // Get knowledge graph stats
      const kgStats = await this.knowledgeOrganizerService.getKnowledgeGraphStats(uid);

      // Filter sources by token limit
      const filteredSources = this._filterByTokenLimit(contextData.sources, this.MAX_CONTEXT_TOKENS);

      // Build context sections
      const contextSection = this._formatMultiSourceContext(filteredSources);
      const entitiesSection = this._formatRelatedEntities(kgStats, relatedEntities);

      // Build enriched prompt
      const enrichedPrompt = `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 MULTI-SOURCE KNOWLEDGE BASE
I have access to your personalized knowledge base containing:
- ${contextData.sourceBreakdown.documents || 0} relevant documents
- ${contextData.sourceBreakdown.conversations || 0} past conversations
- ${contextData.sourceBreakdown.screenshots || 0} screenshots (OCR extracted)
- ${contextData.sourceBreakdown.audio || 0} audio transcriptions
- ${contextData.sourceBreakdown.external || 0} external database records

${contextSection}
${entitiesSection}

IMPORTANT INSTRUCTIONS:
1. Use information from ALL sources to provide comprehensive answers
2. Cite sources with format: [Source: {title} - {type}]
3. Prioritize document sources but integrate insights from conversations, screenshots, and audio
4. If information conflicts across sources, mention the discrepancy
5. Leverage the knowledge graph entities to provide context-aware responses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER QUERY: ${userQuery}`;

      return {
        prompt: enrichedPrompt,
        userQuery,
        hasContext: contextData.hasContext,
        sources: filteredSources,
        contextTokens: this._estimateTokens(filteredSources),
        relatedEntities
      };

    } catch (error) {
      console.error('Error building enriched prompt:', error);
      return {
        prompt: `${basePrompt}\n\nUSER QUERY: ${userQuery}`,
        userQuery,
        hasContext: false,
        sources: [],
        contextTokens: 0,
        relatedEntities: {}
      };
    }
  }

  // Helper: Estimate tokens
  _estimateTokens(data) {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  // Helper: Filter by token limit
  _filterByTokenLimit(sources, maxTokens) {
    let currentTokens = 0;
    const filtered = [];

    for (const source of sources) {
      const sourceTokens = this._estimateTokens(source);
      if (currentTokens + sourceTokens <= maxTokens) {
        filtered.push(source);
        currentTokens += sourceTokens;
      } else {
        break;
      }
    }

    return filtered;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const ragService = new MockRAGService();

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 DÉBUT DES TESTS - RAG MULTI-SOURCES - JOUR 5');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 1: _searchConversations - Recherche de base
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('Test 1: _searchConversations - Recherche de base');
    const results = await ragService._searchConversations('React performance', 'user123', { limit: 5 });

    assert(results.length > 0, 'Should find conversations');
    assert(results[0].source_type === 'conversation', 'Should have correct source type');
    assert(results[0].relevance_score > 0, 'Should have relevance score');
    assert(results[0].content, 'Should have content');

    console.log(`✅ PASS - Trouvé ${results.length} conversation(s)`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 2: _searchConversations - Scoring par mots-clés
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 2: _searchConversations - Scoring par mots-clés');
    const results = await ragService._searchConversations('React performance optimization', 'user123');

    assert(results.length > 0, 'Should find conversations');
    // First result should be about React performance (higher relevance)
    assert(results[0].content.toLowerCase().includes('react'), 'Top result should mention React');
    assert(results[0].relevance_score >= 0.5, 'Should have good relevance score');

    console.log(`✅ PASS - Score de pertinence: ${results[0].relevance_score.toFixed(2)}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 3: _searchScreenshots - Recherche OCR
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 3: _searchScreenshots - Recherche OCR');
    const results = await ragService._searchScreenshots('React useEffect bug', 'user123');

    assert(results.length > 0, 'Should find screenshots');
    assert(results[0].source_type === 'screenshot', 'Should have correct source type');
    assert(results[0].content.toLowerCase().includes('react'), 'Should contain relevant content');

    console.log(`✅ PASS - Trouvé ${results.length} screenshot(s)`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 4: _searchAudio - Recherche transcriptions
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 4: _searchAudio - Recherche transcriptions audio');
    const results = await ragService._searchAudio('database optimization', 'user123');

    assert(results.length > 0, 'Should find audio transcriptions');
    assert(results[0].source_type === 'audio', 'Should have correct source type');
    assert(results[0].content.includes('SPEAKER_'), 'Should contain speaker diarization');

    console.log(`✅ PASS - Trouvé ${results.length} transcription(s)`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 5: _searchExternal - Recherche bases externes
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 5: _searchExternal - Recherche bases de données externes');
    const results = await ragService._searchExternal('customer feedback quality', 'user123');

    assert(results.length > 0, 'Should find external database records');
    assert(results[0].source_type === 'external_database', 'Should have correct source type');
    assert(results[0].relevance_score > 0, 'Should have relevance score');

    console.log(`✅ PASS - Trouvé ${results.length} enregistrement(s) externe(s)`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 6: _applySourceWeighting - Pondération correcte
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 6: _applySourceWeighting - Pondération par type de source');
    const chunks = [
      { id: '1', source_type: 'document', relevance_score: 0.8 },
      { id: '2', source_type: 'conversation', relevance_score: 0.8 },
      { id: '3', source_type: 'screenshot', relevance_score: 0.8 },
      { id: '4', source_type: 'audio', relevance_score: 0.8 },
      { id: '5', source_type: 'external_database', relevance_score: 0.8 }
    ];

    const weighted = ragService._applySourceWeighting(chunks);

    // Use tolerance for floating-point comparisons
    const tolerance = 0.001;
    assert(Math.abs(weighted[0].weighted_score - 0.8) < tolerance, 'Document weight should be 1.0 (0.8 * 1.0)');
    assert(Math.abs(weighted[1].weighted_score - 0.68) < tolerance, 'Conversation weight should be 0.85 (0.8 * 0.85)');
    assert(Math.abs(weighted[2].weighted_score - 0.6) < tolerance, 'Screenshot weight should be 0.75 (0.8 * 0.75)');
    assert(Math.abs(weighted[3].weighted_score - 0.64) < tolerance, 'Audio weight should be 0.8 (0.8 * 0.8)');
    assert(Math.abs(weighted[4].weighted_score - 0.72) < tolerance, 'External DB weight should be 0.9 (0.8 * 0.9)');

    console.log('✅ PASS - Pondération correcte appliquée');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 7: retrieveContextMultiSource - Recherche multi-sources complète
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 7: retrieveContextMultiSource - Recherche complète');
    const results = await ragService.retrieveContextMultiSource('React performance database', 'user123', {
      sources: ['documents', 'conversations', 'screenshots', 'audio', 'external'],
      maxChunks: 10
    });

    assert(results.hasContext === true, 'Should have context');
    assert(results.chunks.length > 0, 'Should have chunks');
    assert(results.sources.length > 0, 'Should have sources');
    assert(results.sourceBreakdown, 'Should have source breakdown');
    assert(results.totalTokens > 0, 'Should estimate tokens');

    console.log(`✅ PASS - Contexte multi-sources récupéré:`);
    console.log(`   - Documents: ${results.sourceBreakdown.documents}`);
    console.log(`   - Conversations: ${results.sourceBreakdown.conversations}`);
    console.log(`   - Screenshots: ${results.sourceBreakdown.screenshots}`);
    console.log(`   - Audio: ${results.sourceBreakdown.audio}`);
    console.log(`   - External: ${results.sourceBreakdown.external}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 8: retrieveContextMultiSource - Filtre par sources
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 8: retrieveContextMultiSource - Filtre par sources spécifiques');
    const results = await ragService.retrieveContextMultiSource('React', 'user123', {
      sources: ['conversations', 'screenshots'], // Only these two
      maxChunks: 10
    });

    assert(results.chunks.length > 0, 'Should have chunks');
    assert(results.sourceBreakdown.documents === 0, 'Should NOT have documents');
    assert(results.sourceBreakdown.audio === 0, 'Should NOT have audio');
    assert(results.sourceBreakdown.external === 0, 'Should NOT have external');

    console.log(`✅ PASS - Filtre de sources respecté`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 9: retrieveContextMultiSource - Respect de maxChunks
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 9: retrieveContextMultiSource - Limite maxChunks');
    const results = await ragService.retrieveContextMultiSource('React database', 'user123', {
      maxChunks: 3
    });

    assert(results.chunks.length <= 3, 'Should respect maxChunks limit');

    console.log(`✅ PASS - Limite de ${results.chunks.length} chunks respectée`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 10: retrieveContextMultiSource - Tri par weighted_score
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 10: retrieveContextMultiSource - Tri par score pondéré');
    const results = await ragService.retrieveContextMultiSource('React performance', 'user123');

    // Check that chunks are sorted by weighted_score
    for (let i = 0; i < results.chunks.length - 1; i++) {
      const currentScore = results.chunks[i].weighted_score || results.chunks[i].relevance_score;
      const nextScore = results.chunks[i + 1].weighted_score || results.chunks[i + 1].relevance_score;
      assert(currentScore >= nextScore, 'Chunks should be sorted by score descending');
    }

    console.log('✅ PASS - Chunks triés par score pondéré');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 11: _formatMultiSourceContext - Formatage du contexte
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 11: _formatMultiSourceContext - Formatage du contexte');
    const sources = [
      { id: '1', type: 'document', title: 'React Guide', summary: 'Performance tips', score: 0.9 },
      { id: '2', type: 'conversation', title: 'Team Discussion', summary: 'React best practices', score: 0.75 },
      { id: '3', type: 'screenshot', title: 'Code Screenshot', summary: 'Bug example', score: 0.6 }
    ];

    const formatted = ragService._formatMultiSourceContext(sources);

    assert(formatted.includes('📄 Documents:'), 'Should have document section');
    assert(formatted.includes('💬 Past Conversations:'), 'Should have conversation section');
    assert(formatted.includes('📸 Screenshots (OCR):'), 'Should have screenshot section');
    assert(formatted.includes('React Guide'), 'Should include source titles');
    assert(formatted.includes('90%'), 'Should show relevance percentage');

    console.log('✅ PASS - Contexte formaté correctement');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 12: _formatMultiSourceContext - Sources vides
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 12: _formatMultiSourceContext - Gestion sources vides');
    const formatted = ragService._formatMultiSourceContext([]);

    assert(formatted === '', 'Should return empty string for no sources');

    console.log('✅ PASS - Sources vides gérées correctement');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 13: _formatRelatedEntities - Formatage entités
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 13: _formatRelatedEntities - Formatage des entités du graphe');
    const kgStats = {
      totalEntities: 15,
      topEntities: [
        { entity_type: 'technology', entity_name: 'React', mention_count: 5 },
        { entity_type: 'topic', entity_name: 'Performance', mention_count: 4 }
      ]
    };

    const formatted = ragService._formatRelatedEntities(kgStats, {});

    assert(formatted.includes('RELATED ENTITIES'), 'Should have entities header');
    assert(formatted.includes('React'), 'Should include entity names');
    assert(formatted.includes('5 times'), 'Should include mention counts');
    assert(formatted.includes('⚙️'), 'Should include technology icon');

    console.log('✅ PASS - Entités formatées correctement');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 14: buildEnrichedPromptMultiSource - Prompt complet
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 14: buildEnrichedPromptMultiSource - Construction prompt enrichi');

    const contextData = await ragService.retrieveContextMultiSource('React performance', 'user123');
    const result = await ragService.buildEnrichedPromptMultiSource(
      'How to optimize React performance?',
      'You are a helpful assistant.',
      contextData,
      'user123'
    );

    assert(result.prompt, 'Should have prompt');
    assert(result.prompt.includes('MULTI-SOURCE KNOWLEDGE BASE'), 'Should include header');
    assert(result.prompt.includes('relevant documents'), 'Should mention documents');
    assert(result.prompt.includes('past conversations'), 'Should mention conversations');
    assert(result.prompt.includes('USER QUERY'), 'Should include user query');
    assert(result.hasContext === true, 'Should have context');
    assert(result.sources.length > 0, 'Should have sources');
    assert(result.relatedEntities, 'Should have related entities');

    console.log('✅ PASS - Prompt enrichi construit');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 15: buildEnrichedPromptMultiSource - Instructions incluses
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 15: buildEnrichedPromptMultiSource - Instructions d\'utilisation');

    const contextData = await ragService.retrieveContextMultiSource('React', 'user123');
    const result = await ragService.buildEnrichedPromptMultiSource(
      'What is React?',
      'You are helpful.',
      contextData,
      'user123'
    );

    assert(result.prompt.includes('IMPORTANT INSTRUCTIONS'), 'Should have instructions');
    assert(result.prompt.includes('Cite sources'), 'Should mention citing sources');
    assert(result.prompt.includes('[Source:'), 'Should show citation format');

    console.log('✅ PASS - Instructions incluses dans le prompt');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 16: buildEnrichedPromptMultiSource - Gestion erreurs
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 16: buildEnrichedPromptMultiSource - Gestion des erreurs');

    // Pass invalid contextData
    const result = await ragService.buildEnrichedPromptMultiSource(
      'Test query',
      'Base prompt',
      { hasContext: false, sources: [], sourceBreakdown: {} },
      'user123'
    );

    assert(result.prompt, 'Should still return a prompt');
    assert(result.prompt.includes('Base prompt'), 'Should include base prompt');
    assert(result.prompt.includes('Test query'), 'Should include query');

    console.log('✅ PASS - Erreurs gérées gracieusement');
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 17: _estimateTokens - Estimation de tokens
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 17: _estimateTokens - Estimation du nombre de tokens');

    const data = { text: 'This is a test string for token estimation' };
    const tokens = ragService._estimateTokens(data);

    assert(tokens > 0, 'Should estimate tokens');
    assert(typeof tokens === 'number', 'Should return a number');

    console.log(`✅ PASS - Estimé ${tokens} tokens`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 18: _filterByTokenLimit - Filtrage par limite de tokens
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 18: _filterByTokenLimit - Filtrage par limite de tokens');

    const sources = [
      { id: '1', type: 'document', title: 'A'.repeat(1000), summary: 'Long content' },
      { id: '2', type: 'document', title: 'B'.repeat(1000), summary: 'More long content' },
      { id: '3', type: 'document', title: 'C'.repeat(1000), summary: 'Even more content' }
    ];

    const filtered = ragService._filterByTokenLimit(sources, 500);

    assert(filtered.length < sources.length, 'Should filter out sources that exceed limit');
    assert(filtered.length >= 1, 'Should keep at least one source');

    console.log(`✅ PASS - Filtré de ${sources.length} à ${filtered.length} sources`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 19: Intégration - Flux complet RAG multi-sources
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 19: Intégration - Flux complet RAG multi-sources');

    // 1. Retrieve context
    const contextData = await ragService.retrieveContextMultiSource(
      'How to optimize React performance and database queries?',
      'user123',
      { maxChunks: 8 }
    );

    assert(contextData.hasContext, 'Step 1: Should retrieve context');

    // 2. Build enriched prompt
    const promptResult = await ragService.buildEnrichedPromptMultiSource(
      'How to optimize React performance and database queries?',
      'You are an expert developer assistant.',
      contextData,
      'user123'
    );

    assert(promptResult.prompt.length > 0, 'Step 2: Should build prompt');
    assert(promptResult.hasContext, 'Step 2: Should have context');

    // 3. Verify multi-source integration
    const hasMultipleSources = Object.values(contextData.sourceBreakdown).filter(count => count > 0).length >= 2;
    assert(hasMultipleSources, 'Step 3: Should have multiple source types');

    console.log('✅ PASS - Flux complet RAG multi-sources fonctionnel');
    console.log(`   Breakdown: ${JSON.stringify(contextData.sourceBreakdown)}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 20: Performance - Recherche sur grande base
  // ═════════════════════════════════════════════════════════════════════════
  totalTests++;
  try {
    console.log('\nTest 20: Performance - Temps de recherche multi-sources');

    const startTime = Date.now();

    await ragService.retrieveContextMultiSource('React database optimization', 'user123', {
      maxChunks: 15
    });

    const duration = Date.now() - startTime;

    assert(duration < 5000, 'Should complete in reasonable time (<5s)');

    console.log(`✅ PASS - Recherche complétée en ${duration}ms`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    failedTests++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RÉSUMÉ DES TESTS
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DES TESTS - RAG MULTI-SOURCES');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`\nTotal de tests: ${totalTests}`);
  console.log(`✅ Réussis: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Échoués: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);

  if (failedTests === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS! 🎉');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) ont échoué`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');

  return { totalTests, passedTests, failedTests };
}

// Run tests
if (require.main === module) {
  runTests()
    .then(results => {
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
