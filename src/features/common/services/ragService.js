/**
 * Phase 4: RAG Service (Retrieval Augmented Generation)
 *
 * Orchestrates context retrieval from knowledge base and injection into prompts.
 * Manages citations and context window limits.
 */

const { loaders } = require('../utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
const indexingService = require('./indexingService');
const documentService = require('./documentService');
const { estimateTokens } = require('../utils/tokenUtils');
const sqliteClient = require('./sqliteClient');
const knowledgeOrganizerService = require('./knowledgeOrganizerService');
const embeddingProvider = require('./embeddingProvider');
const { RAG } = require('../config/constants');

/**
 * @class RAGService
 * @description Service for RAG (Retrieval Augmented Generation)
 */
class RAGService {
    constructor() {
        this.citationsRepository = null;
        this.MAX_CONTEXT_TOKENS = RAG.MAX_CONTEXT_TOKENS; // Maximum tokens for injected context
        this.MIN_RELEVANCE_SCORE = RAG.MIN_RELEVANCE_SCORE; // Minimum similarity score
        console.log('[RAGService] Service initialized');
    }

    /**
     * Initialize service with repository
     * @param {Object} citationsRepo - Citations repository
     */
    initialize(citationsRepo) {
        this.citationsRepository = citationsRepo;
        console.log('[RAGService] Repository connected');
    }

    /**
     * Retrieve relevant context for a query
     * @param {string} query - User query
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} Context data with sources
     */
    async retrieveContext(query, options = {}) {
        const {
            maxChunks = RAG.DEFAULT_MAX_CHUNKS,
            documentIds = null,
            minScore = this.MIN_RELEVANCE_SCORE
        } = options;

        // Validate maxChunks parameter range
        if (typeof maxChunks !== 'number' || maxChunks < RAG.MIN_MAX_CHUNKS || maxChunks > RAG.MAX_MAX_CHUNKS) {
            throw new Error(`[RAGService] Invalid maxChunks: ${maxChunks}. Must be between ${RAG.MIN_MAX_CHUNKS} and ${RAG.MAX_MAX_CHUNKS}`);
        }

        console.log(`[RAGService] Retrieving context for query: "${query.substring(0, 50)}..."`);

        try {
            // Search for relevant chunks
            const chunks = await indexingService.semanticSearch(query, {
                limit: maxChunks,
                minScore,
                documentIds
            });

            if (chunks.length === 0) {
                console.log('[RAGService] No relevant context found');
                return {
                    hasContext: false,
                    chunks: [],
                    sources: [],
                    totalTokens: 0
                };
            }

            // Get document metadata for chunks (batch query to avoid N+1)
            const uniqueDocIds = [...new Set(chunks.map(c => c.document_id))];
            const documentMap = new Map();

            if (uniqueDocIds.length > 0) {
                // Fetch all documents in one query
                const query = `
                    SELECT id, uid, title, filename, file_type, file_size,
                           tags, description, chunk_count, indexed,
                           created_at, updated_at
                    FROM documents
                    WHERE id IN (${uniqueDocIds.map(() => '?').join(',')})
                `;

                try {
                    const docs = await documentService.documentsRepository.query(query, uniqueDocIds);
                    docs.forEach(doc => {
                        documentMap.set(doc.id, {
                            ...doc,
                            tags: doc.tags ? JSON.parse(doc.tags) : []
                        });
                    });
                } catch (error) {
                    console.error('[RAGService] Error fetching documents:', error);
                }
            }

            // Build sources list with page numbers for citations
            const sources = chunks.map(chunk => {
                const doc = documentMap.get(chunk.document_id);
                return {
                    chunk_id: chunk.id,
                    document_id: chunk.document_id,
                    document_title: doc ? doc.title : 'Unknown',
                    document_filename: doc ? doc.filename : 'Unknown',
                    document_file_type: doc ? doc.file_type : 'Unknown',
                    content: chunk.content,
                    relevance_score: chunk.relevance_score,
                    chunk_index: chunk.chunk_index,
                    page_number: chunk.page_number || null // Include page number for PDFs
                };
            });

            // Calculate total tokens
            const totalTokens = chunks.reduce((sum, c) => sum + (c.token_count || 0), 0);

            console.log(`[RAGService] Retrieved ${chunks.length} chunks (${totalTokens} tokens)`);

            return {
                hasContext: true,
                chunks,
                sources,
                totalTokens
            };
        } catch (error) {
            console.error('[RAGService] Error retrieving context:', error);
            return {
                hasContext: false,
                chunks: [],
                sources: [],
                totalTokens: 0
            };
        }
    }

    /**
     * Build enriched prompt with knowledge base context
     * @param {string} userQuery - Original user query
     * @param {string} basePrompt - Base system prompt
     * @param {Object} contextData - Context from retrieveContext()
     * @returns {Promise<Object>} Enriched prompt and metadata
     */
    async buildEnrichedPrompt(userQuery, basePrompt, contextData) {
        console.log('[RAGService] Building enriched prompt');

        try {
            if (!contextData.hasContext || contextData.chunks.length === 0) {
                return {
                    prompt: basePrompt,
                    userQuery,
                    hasContext: false,
                    sources: []
                };
            }

            // Filter chunks to fit context window
            const filteredSources = this._filterByTokenLimit(
                contextData.sources,
                this.MAX_CONTEXT_TOKENS
            );

            // Build context section
            const contextSection = this._formatContext(filteredSources);

            // Build enriched prompt
            const enrichedPrompt = `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 KNOWLEDGE BASE CONTEXT

The following information from the knowledge base may be relevant to answer the user's question. Use this context to provide accurate, cited responses.

${contextSection}

IMPORTANT INSTRUCTIONS FOR USING CONTEXT:
1. When using information from the context, cite the source: [Source: {document_title}]
2. If the context doesn't contain relevant information, rely on your general knowledge
3. Be transparent about which information comes from the knowledge base vs. your training
4. Prioritize context information over general knowledge when they conflict
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            console.log(`[RAGService] Context injected: ${filteredSources.length} sources`);

            return {
                prompt: enrichedPrompt,
                userQuery,
                hasContext: true,
                sources: filteredSources,
                contextTokens: filteredSources.reduce((sum, s) => sum + estimateTokens(s.content), 0)
            };
        } catch (error) {
            console.error('[RAGService] Error building enriched prompt:', error);
            return {
                prompt: basePrompt,
                userQuery,
                hasContext: false,
                sources: []
            };
        }
    }

    /**
     * Build knowledge base aware prompt - ALWAYS informs the model about the KB
     * @param {string} userQuery - Original user query
     * @param {string} basePrompt - Base system prompt
     * @param {Object} kbStatus - Knowledge base status { hasDocuments, indexedCount, totalCount }
     * @param {Object|null} contextData - Context from retrieveContext() or null
     * @returns {Promise<Object>} Enriched prompt with KB awareness
     */
    async buildKnowledgeBaseAwarePrompt(userQuery, basePrompt, kbStatus, contextData = null) {
        console.log('[RAGService] Building KB-aware prompt');

        try {
            let kbSection = '';
            let hasContext = false;
            let sources = [];

            // Case 1: Context found - inject relevant documents
            if (contextData && contextData.hasContext && contextData.chunks.length > 0) {
                const filteredSources = this._filterByTokenLimit(
                    contextData.sources,
                    this.MAX_CONTEXT_TOKENS
                );
                const contextSection = this._formatContext(filteredSources);
                hasContext = true;
                sources = filteredSources;

                kbSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 BASE DE CONNAISSANCES PERSONNELLE

Tu as accès à la base de connaissances personnelle de l'utilisateur contenant ${kbStatus.indexedCount} document(s) indexé(s).

Les informations suivantes ont été trouvées et peuvent être pertinentes pour répondre à la question :

${contextSection}

INSTRUCTIONS IMPORTANTES :
1. Utilise ces informations pour fournir une réponse précise et contextuelle
2. Cite tes sources : [Source: {nom_du_document}]
3. Si le contexte ne contient pas l'information demandée, dis-le clairement
4. Priorise les informations de la base de connaissances sur tes connaissances générales
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                console.log(`[RAGService] ✅ KB-aware prompt: ${filteredSources.length} sources injected`);
            }
            // Case 2: Documents exist but no relevant context found
            else if (kbStatus.hasDocuments && kbStatus.indexedCount > 0) {
                kbSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 BASE DE CONNAISSANCES PERSONNELLE

Tu as accès à la base de connaissances personnelle de l'utilisateur contenant ${kbStatus.indexedCount} document(s) indexé(s).

⚠️ Aucune information pertinente n'a été trouvée dans la base de connaissances pour cette question spécifique.

INSTRUCTIONS :
1. Réponds en utilisant tes connaissances générales
2. Informe l'utilisateur que tu n'as pas trouvé d'information pertinente dans sa base de connaissances
3. Suggère à l'utilisateur d'ajouter des documents pertinents s'il souhaite des réponses basées sur ses propres données
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                console.log(`[RAGService] ⚠️ KB-aware prompt: No relevant context, but ${kbStatus.indexedCount} docs available`);
            }
            // Case 3: No documents in knowledge base
            else {
                kbSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 BASE DE CONNAISSANCES PERSONNELLE

L'utilisateur dispose d'une base de connaissances personnelle, mais elle est actuellement vide.

INSTRUCTIONS :
1. Réponds en utilisant tes connaissances générales
2. Si l'utilisateur demande des informations spécifiques à son contexte, suggère-lui d'ajouter des documents à sa base de connaissances via la section "Documents"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                console.log('[RAGService] ℹ️ KB-aware prompt: KB is empty');
            }

            const enrichedPrompt = `${basePrompt}
${kbSection}`;

            return {
                prompt: enrichedPrompt,
                userQuery,
                hasContext,
                sources,
                kbStatus
            };
        } catch (error) {
            console.error('[RAGService] Error building KB-aware prompt:', error);
            return {
                prompt: basePrompt,
                userQuery,
                hasContext: false,
                sources: [],
                kbStatus
            };
        }
    }

    /**
     * Track citation usage in a conversation
     * @param {string} sessionId - Session ID
     * @param {string} messageId - AI message ID
     * @param {Array} sources - Sources that were used
     * @returns {Promise<Array>} Created citation records
     */
    async trackCitations(sessionId, messageId, sources) {
        console.log(`[RAGService] Tracking ${sources.length} citations`);

        try {
            if (sources.length === 0) return [];

            const citations = sources.map(source => ({
                id: uuidv4(),
                session_id: sessionId,
                message_id: messageId,
                document_id: source.document_id,
                chunk_id: source.chunk_id,
                relevance_score: source.relevance_score,
                context_used: source.content,
                created_at: Date.now(),
                sync_state: 'clean'
            }));

            // Batch insert: all citations in one query
            const columns = Object.keys(citations[0]).join(', ');
            const placeholderRow = `(${Object.keys(citations[0]).map(() => '?').join(', ')})`;
            const allPlaceholders = citations.map(() => placeholderRow).join(', ');

            const query = `INSERT INTO document_citations (${columns}) VALUES ${allPlaceholders}`;
            const allValues = citations.flatMap(citation => Object.values(citation));

            await this.citationsRepository.execute(query, allValues);

            console.log(`[RAGService] Citations tracked: ${citations.length}`);

            return citations;
        } catch (error) {
            console.error('[RAGService] Error tracking citations:', error);
            return [];
        }
    }

    /**
     * Get citations for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array>} Citations with document metadata
     */
    async getSessionCitations(sessionId) {
        console.log(`[RAGService] Getting citations for session: ${sessionId}`);

        try {
            const query = `
                SELECT
                    c.*,
                    d.title as document_title,
                    d.filename as document_filename
                FROM document_citations c
                LEFT JOIN documents d ON c.document_id = d.id
                WHERE c.session_id = ?
                ORDER BY c.created_at DESC
            `;

            const citations = await this.citationsRepository.query(query, [sessionId]);

            return citations;
        } catch (error) {
            console.error('[RAGService] Error getting citations:', error);
            return [];
        }
    }

    /**
     * Get most cited documents for a user
     * @param {string} uid - User ID
     * @param {number} limit - Number of results
     * @returns {Promise<Array>} Top cited documents
     */
    async getTopCitedDocuments(uid, limit = 10) {
        console.log(`[RAGService] Getting top cited documents for user: ${uid}`);

        try {
            const query = `
                SELECT
                    d.id,
                    d.title,
                    d.filename,
                    COUNT(c.id) as citation_count,
                    AVG(c.relevance_score) as avg_relevance
                FROM documents d
                INNER JOIN document_citations c ON d.id = c.document_id
                WHERE d.uid = ?
                GROUP BY d.id
                ORDER BY citation_count DESC, avg_relevance DESC
                LIMIT ?
            `;

            const results = await this.citationsRepository.query(query, [uid, limit]);

            return results;
        } catch (error) {
            console.error('[RAGService] Error getting top cited documents:', error);
            return [];
        }
    }

    /**
     * Format context sources for prompt injection
     * @private
     * @param {Array} sources - Filtered sources
     * @returns {string} Formatted context string
     */
    _formatContext(sources) {
        return sources.map((source, index) => {
            // Build page info string if available
            const pageInfo = source.page_number
                ? `│  Page: ${source.page_number}\n`
                : '';

            return `
┌─ Source ${index + 1}: ${source.document_title}
│  File: ${source.document_filename}
${pageInfo}│  Relevance: ${(source.relevance_score * 100).toFixed(1)}%
│
│  ${source.content}
└─────────────────────────────────────────────────────
`;
        }).join('\n');
    }

    /**
     * Filter sources by token limit
     * @private
     * @param {Array} sources - All sources
     * @param {number} maxTokens - Maximum tokens allowed
     * @returns {Array} Filtered sources
     */
    _filterByTokenLimit(sources, maxTokens) {
        const filtered = [];
        let currentTokens = 0;

        for (const source of sources) {
            const sourceTokens = estimateTokens(source.content);

            if (currentTokens + sourceTokens <= maxTokens) {
                filtered.push(source);
                currentTokens += sourceTokens;
            } else {
                break;
            }
        }

        return filtered;
    }

    /**
     * Set maximum context tokens
     * @param {number} maxTokens - Maximum tokens
     */
    setMaxContextTokens(maxTokens) {
        this.MAX_CONTEXT_TOKENS = maxTokens;
        console.log(`[RAGService] Max context tokens set to: ${maxTokens}`);
    }

    /**
     * Set minimum relevance score
     * @param {number} minScore - Minimum score (0-1)
     */
    setMinRelevanceScore(minScore) {
        this.MIN_RELEVANCE_SCORE = minScore;
        console.log(`[RAGService] Min relevance score set to: ${minScore}`);
    }

    // ========================================================================
    // PHASE 2: MULTI-SOURCE RAG
    // ========================================================================

    /**
     * Retrieve context from multiple sources (documents, conversations, screenshots, audio, external)
     * @param {string} query - User query
     * @param {string} uid - User ID
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} Multi-source context data
     */
    async retrieveContextMultiSource(query, uid, options = {}) {
        const {
            sources = ['documents', 'conversations', 'screenshots', 'audio', 'external'],
            maxChunks = RAG.DEFAULT_MAX_CHUNKS,
            minScore = this.MIN_RELEVANCE_SCORE
        } = options;

        console.log(`[RAGService] Multi-source retrieval for: "${query.substring(0, 50)}..."`);

        const results = {
            hasContext: false,
            chunks: [],
            sources: [],
            totalTokens: 0,
            sourceBreakdown: {}
        };

        try {
            // 1. Documents (existing indexing service)
            if (sources.includes('documents')) {
                const docChunks = await indexingService.semanticSearch(query, {
                    limit: maxChunks,
                    minScore
                });
                results.chunks.push(...docChunks.map(c => ({ ...c, source_type: 'document' })));
                results.sourceBreakdown.documents = docChunks.length;
            }

            // 2. Conversations indexed
            if (sources.includes('conversations')) {
                const convChunks = await this._searchConversations(query, uid, {
                    limit: Math.ceil(maxChunks / 2),
                    minScore
                });
                results.chunks.push(...convChunks);
                results.sourceBreakdown.conversations = convChunks.length;
            }

            // 3. Screenshots (OCR)
            if (sources.includes('screenshots')) {
                const screenshotChunks = await this._searchScreenshots(query, uid, {
                    limit: Math.ceil(maxChunks / 3),
                    minScore
                });
                results.chunks.push(...screenshotChunks);
                results.sourceBreakdown.screenshots = screenshotChunks.length;
            }

            // 4. Audio transcripts
            if (sources.includes('audio')) {
                const audioChunks = await this._searchAudio(query, uid, {
                    limit: Math.ceil(maxChunks / 3),
                    minScore
                });
                results.chunks.push(...audioChunks);
                results.sourceBreakdown.audio = audioChunks.length;
            }

            // 5. External databases
            if (sources.includes('external')) {
                const externalChunks = await this._searchExternal(query, uid, {
                    limit: Math.ceil(maxChunks / 4),
                    minScore
                });
                results.chunks.push(...externalChunks);
                results.sourceBreakdown.external = externalChunks.length;
            }

            // Apply source weighting
            results.chunks = this._applySourceWeighting(results.chunks);

            // Sort by weighted score
            results.chunks.sort((a, b) => (b.weighted_score || b.relevance_score) - (a.weighted_score || a.relevance_score));

            // Limit to maxChunks
            results.chunks = results.chunks.slice(0, maxChunks);

            // Build sources list
            results.sources = this._buildEnrichedSources(results.chunks);
            results.totalTokens = results.chunks.reduce((sum, c) => sum + (c.token_count || estimateTokens(c.content || '')), 0);
            results.hasContext = results.chunks.length > 0;

            console.log(`[RAGService] Retrieved ${results.chunks.length} chunks from ${Object.keys(results.sourceBreakdown).length} source types`);

            return results;
        } catch (error) {
            console.error('[RAGService] Multi-source retrieval error:', error);
            return results;
        }
    }

    /**
     * Search in indexed conversations
     * @private
     */
    async _searchConversations(query, uid, options = {}) {
        const { limit = 5, minScore = 0.7 } = options;

        try {
            const db = sqliteClient.getDb();

            // Fix MEDIUM BUG-M25: Cap result limit to prevent excessive memory usage
            // Note: better-sqlite3 is synchronous by design and optimized for Electron apps
            const MAX_RESULTS = 100;
            const cappedLimit = Math.min(limit * 2, MAX_RESULTS);

            // Get conversations from auto_indexed_content
            const conversations = db.prepare(`
                SELECT id, source_id, source_title, content, content_summary,
                       entities, tags, importance_score, indexed_at
                FROM auto_indexed_content
                WHERE uid = ? AND source_type = 'conversation'
                ORDER BY importance_score DESC, indexed_at DESC
                LIMIT ?
            `).all(uid, cappedLimit);

            if (conversations.length === 0) return [];

            // Score conversations by text similarity (simple keyword matching as fallback)
            const queryLower = query.toLowerCase();
            const scoredConversations = conversations
                .map(conv => {
                    const contentLower = (conv.content || '').toLowerCase();
                    const summaryLower = (conv.content_summary || '').toLowerCase();

                    let score = conv.importance_score || 0.5;

                    // Boost if query keywords in content
                    const queryWords = queryLower.split(/\s+/);
                    const matches = queryWords.filter(word => word.length > 3 && contentLower.includes(word)).length;
                    score += (matches / queryWords.length) * 0.3;

                    // Boost if in summary
                    if (summaryLower.includes(queryLower) || queryWords.some(w => w.length > 3 && summaryLower.includes(w))) {
                        score += 0.2;
                    }

                    return {
                        ...conv,
                        relevance_score: Math.min(score, 1.0),
                        source_type: 'conversation'
                    };
                })
                .filter(c => c.relevance_score >= minScore)
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .slice(0, limit);

            return scoredConversations.map(c => ({
                id: c.id,
                source_type: 'conversation',
                source_id: c.source_id,
                source_title: c.source_title,
                content: c.content_summary || c.content.substring(0, 500),
                relevance_score: c.relevance_score,
                importance_score: c.importance_score,
                indexed_at: c.indexed_at,
                token_count: estimateTokens(c.content_summary || c.content.substring(0, 500))
            }));
        } catch (error) {
            console.error('[RAGService] Error searching conversations:', error);
            return [];
        }
    }

    /**
     * Search in indexed screenshots
     * @private
     */
    async _searchScreenshots(query, uid, options = {}) {
        const { limit = 3, minScore = 0.7 } = options;

        try {
            const db = sqliteClient.getDb();

            const screenshots = db.prepare(`
                SELECT id, source_id, source_title, content, content_summary,
                       entities, importance_score, indexed_at
                FROM auto_indexed_content
                WHERE uid = ? AND source_type = 'screenshot'
                ORDER BY importance_score DESC, indexed_at DESC
                LIMIT ?
            `).all(uid, limit * 2);

            if (screenshots.length === 0) return [];

            // Score by keyword matching
            const queryLower = query.toLowerCase();
            const scoredScreenshots = screenshots
                .map(ss => {
                    const contentLower = (ss.content || '').toLowerCase();
                    const queryWords = queryLower.split(/\s+/);
                    const matches = queryWords.filter(word => word.length > 3 && contentLower.includes(word)).length;

                    const score = (ss.importance_score || 0.5) + (matches / queryWords.length) * 0.3;

                    return {
                        ...ss,
                        relevance_score: Math.min(score, 1.0),
                        source_type: 'screenshot'
                    };
                })
                .filter(s => s.relevance_score >= minScore)
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .slice(0, limit);

            return scoredScreenshots.map(s => ({
                id: s.id,
                source_type: 'screenshot',
                source_id: s.source_id,
                source_title: s.source_title,
                content: s.content.substring(0, 300),
                relevance_score: s.relevance_score,
                indexed_at: s.indexed_at,
                token_count: estimateTokens(s.content.substring(0, 300))
            }));
        } catch (error) {
            console.error('[RAGService] Error searching screenshots:', error);
            return [];
        }
    }

    /**
     * Search in indexed audio transcripts
     * @private
     */
    async _searchAudio(query, uid, options = {}) {
        const { limit = 3, minScore = 0.7 } = options;

        try {
            const db = sqliteClient.getDb();

            const audio = db.prepare(`
                SELECT id, source_id, source_title, content, content_summary,
                       entities, importance_score, indexed_at
                FROM auto_indexed_content
                WHERE uid = ? AND source_type = 'audio'
                ORDER BY importance_score DESC, indexed_at DESC
                LIMIT ?
            `).all(uid, limit * 2);

            if (audio.length === 0) return [];

            const queryLower = query.toLowerCase();
            const scoredAudio = audio
                .map(a => {
                    const summaryLower = (a.content_summary || '').toLowerCase();
                    const queryWords = queryLower.split(/\s+/);
                    const matches = queryWords.filter(word => word.length > 3 && summaryLower.includes(word)).length;

                    const score = (a.importance_score || 0.5) + (matches / queryWords.length) * 0.3;

                    return {
                        ...a,
                        relevance_score: Math.min(score, 1.0),
                        source_type: 'audio'
                    };
                })
                .filter(a => a.relevance_score >= minScore)
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .slice(0, limit);

            return scoredAudio.map(a => ({
                id: a.id,
                source_type: 'audio',
                source_id: a.source_id,
                source_title: a.source_title,
                content: a.content_summary || a.content.substring(0, 400),
                relevance_score: a.relevance_score,
                indexed_at: a.indexed_at,
                token_count: estimateTokens(a.content_summary || a.content.substring(0, 400))
            }));
        } catch (error) {
            console.error('[RAGService] Error searching audio:', error);
            return [];
        }
    }

    /**
     * Search in external database imports
     * @private
     */
    async _searchExternal(query, uid, options = {}) {
        const { limit = 3, minScore = 0.7 } = options;

        try {
            const db = sqliteClient.getDb();

            const external = db.prepare(`
                SELECT id, source_id, source_title, content, content_summary,
                       entities, importance_score, indexed_at
                FROM auto_indexed_content
                WHERE uid = ? AND source_type = 'external_database'
                ORDER BY importance_score DESC, indexed_at DESC
                LIMIT ?
            `).all(uid, limit * 2);

            if (external.length === 0) return [];

            const queryLower = query.toLowerCase();
            const scoredExternal = external
                .map(e => {
                    const contentLower = (e.content || '').toLowerCase();
                    const summaryLower = (e.content_summary || '').toLowerCase();
                    const queryWords = queryLower.split(/\s+/);
                    const matches = queryWords.filter(word => word.length > 3 && (contentLower.includes(word) || summaryLower.includes(word))).length;

                    const score = (e.importance_score || 0.7) + (matches / queryWords.length) * 0.2;

                    return {
                        ...e,
                        relevance_score: Math.min(score, 1.0),
                        source_type: 'external_database'
                    };
                })
                .filter(e => e.relevance_score >= minScore)
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .slice(0, limit);

            return scoredExternal.map(e => ({
                id: e.id,
                source_type: 'external_database',
                source_id: e.source_id,
                source_title: e.source_title,
                content: e.content_summary || e.content.substring(0, 400),
                relevance_score: e.relevance_score,
                indexed_at: e.indexed_at,
                token_count: estimateTokens(e.content_summary || e.content.substring(0, 400))
            }));
        } catch (error) {
            console.error('[RAGService] Error searching external:', error);
            return [];
        }
    }

    /**
     * Apply source weighting to chunks
     * @private
     */
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

    /**
     * Build enriched sources list with metadata
     * @private
     */
    _buildEnrichedSources(chunks) {
        return chunks.map(chunk => ({
            chunk_id: chunk.id,
            source_type: chunk.source_type,
            source_id: chunk.source_id,
            source_title: chunk.source_title,
            content: chunk.content,
            relevance_score: chunk.relevance_score,
            weighted_score: chunk.weighted_score,
            importance_score: chunk.importance_score,
            indexed_at: chunk.indexed_at
        }));
    }

    /**
     * Build enriched prompt with multi-source context and knowledge graph
     * @param {string} userQuery - User query
     * @param {string} basePrompt - Base system prompt
     * @param {Object} contextData - Context from retrieveContextMultiSource()
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Enriched prompt
     */
    async buildEnrichedPromptMultiSource(userQuery, basePrompt, contextData, uid) {
        console.log('[RAGService] Building multi-source enriched prompt');

        try {
            if (!contextData.hasContext) {
                return {
                    prompt: basePrompt,
                    userQuery,
                    hasContext: false,
                    sources: []
                };
            }

            // Get related entities from knowledge graph
            const relatedEntities = await knowledgeOrganizerService.detectEntitiesInQuery(userQuery);

            // Get knowledge graph stats for context
            const kgStats = await knowledgeOrganizerService.getKnowledgeGraphStats(uid);

            // Filter sources by token limit
            const filteredSources = this._filterByTokenLimit(contextData.sources, this.MAX_CONTEXT_TOKENS);

            // Format multi-source context
            const contextSection = this._formatMultiSourceContext(filteredSources);

            // Format knowledge graph entities
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
3. If sources conflict, mention it and explain the differences
4. Prioritize recent information over older data
5. Leverage the knowledge graph to make connections between entities
6. Be aware of recurring topics and projects in the user's context
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            console.log(`[RAGService] Multi-source context injected: ${filteredSources.length} sources`);

            return {
                prompt: enrichedPrompt,
                userQuery,
                hasContext: true,
                sources: filteredSources,
                contextTokens: filteredSources.reduce((sum, s) => sum + estimateTokens(s.content), 0),
                relatedEntities: relatedEntities
            };
        } catch (error) {
            console.error('[RAGService] Error building multi-source prompt:', error);
            return {
                prompt: basePrompt,
                userQuery,
                hasContext: false,
                sources: []
            };
        }
    }

    /**
     * Format multi-source context section
     * @private
     */
    _formatMultiSourceContext(sources) {
        if (sources.length === 0) return 'No relevant context found.';

        const sourceIcons = {
            document: '📄',
            conversation: '💬',
            screenshot: '📸',
            audio: '🎙️',
            external_database: '🗄️'
        };

        return sources.map((source, index) => {
            const icon = sourceIcons[source.source_type] || '📋';
            const scorePercent = Math.round((source.weighted_score || source.relevance_score) * 100);

            return `${icon} Source ${index + 1}: ${source.source_title} (${source.source_type}, relevance: ${scorePercent}%)
${source.content}`;
        }).join('\n\n---\n\n');
    }

    /**
     * Format related entities from knowledge graph
     * @private
     */
    _formatRelatedEntities(kgStats, relatedEntities) {
        if (!kgStats || kgStats.totalEntities === 0) {
            return '';
        }

        let section = '\n🏷️ KNOWLEDGE GRAPH CONTEXT\n\n';

        // Top projects
        if (kgStats.topProjects && kgStats.topProjects.length > 0) {
            section += 'Top Projects:\n';
            kgStats.topProjects.slice(0, 3).forEach(p => {
                section += `  - ${p.name} (mentioned ${p.mentionCount} times)\n`;
            });
            section += '\n';
        }

        // Top people
        if (kgStats.topPeople && kgStats.topPeople.length > 0) {
            section += 'Frequent Contacts:\n';
            kgStats.topPeople.slice(0, 3).forEach(p => {
                section += `  - ${p.name} (mentioned ${p.mentionCount} times)\n`;
            });
            section += '\n';
        }

        // Detected entities in query
        if (relatedEntities && relatedEntities.length > 0) {
            section += `Entities detected in query: ${relatedEntities.join(', ')}\n`;
        }

        return section;
    }
}

// Singleton instance
const ragService = new RAGService();

module.exports = ragService;
