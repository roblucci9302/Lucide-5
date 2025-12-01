/**
 * Knowledge Organizer Service
 *
 * Service intelligent pour l'extraction d'entités et la gestion du knowledge graph
 *
 * Fonctionnalités:
 * - Extraction d'entités avec LLM (projets, personnes, entreprises, dates, topics)
 * - Génération de résumés intelligents
 * - Génération de tags automatique
 * - Gestion du graphe de connaissances
 * - Détection automatique des entités récurrentes
 *
 * @module knowledgeOrganizerService
 */

const { loaders } = require('../utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
const { createLLM } = require('../ai/factory');
const sqliteClient = require('./sqliteClient');
const authService = require('./authService');
const providerSettingsRepository = require('../repositories/providerSettings');

console.log('[KnowledgeOrganizerService] Service loaded');

class KnowledgeOrganizerService {
    constructor() {
        this.db = null;
        this.llmClient = null;
        console.log('[KnowledgeOrganizerService] Service initialized');
    }

    /**
     * Initialize the service
     */
    async initialize() {
        if (!this.db) {
            this.db = sqliteClient.getDb();
        }

        // Check if user is logged in with Firebase or has OpenAI key
        const user = authService.getCurrentUser();
        const isLoggedIn = user && user.isLoggedIn;

        if (!isLoggedIn) {
            // Check for local OpenAI key
            const settings = await providerSettingsRepository.getByProvider('openai');
            if (!settings || !settings.api_key) {
                console.warn('[KnowledgeOrganizerService] No authentication or API key found. LLM features will be limited.');
                return false;
            }
        }

        console.log('[KnowledgeOrganizerService] Service ready with LLM support');
        return true;
    }

    /**
     * Get or create LLM client
     * @private
     */
    async _getLLMClient() {
        // Check if user is logged in
        const user = authService.getCurrentUser();
        const isLoggedIn = user && user.isLoggedIn;

        if (isLoggedIn) {
            // Use Firebase authentication for OpenAI
            return createLLM('openai', {
                model: 'gpt-4.1',
                temperature: 0.3 // Lower temperature for more consistent extraction
            });
        } else {
            // Use local API key
            const settings = await providerSettingsRepository.getByProvider('openai');
            if (!settings || !settings.api_key) {
                return null;
            }

            return createLLM('openai', {
                apiKey: settings.api_key,
                model: 'gpt-4.1',
                temperature: 0.3
            });
        }
    }

    /**
     * Extract entities from text using LLM
     *
     * @param {string} text - Text to analyze
     * @param {object} context - Additional context (source_type, uid, etc.)
     * @returns {Promise<object>} Extracted entities
     */
    async extractEntities(text, context = {}) {
        try {
            const llm = await this._getLLMClient();
            if (!llm) {
                console.warn('[KnowledgeOrganizerService] No LLM available, using fallback extraction');
                return this._fallbackEntityExtraction(text);
            }

            const prompt = `Analyze the following text and extract all relevant entities. Return a JSON object with these categories:

- projects: Array of project names mentioned (e.g., "Project Alpha", "Website Redesign")
- people: Array of people names (e.g., "Marie Dupont", "Jean Martin")
- companies: Array of company/organization names
- dates: Array of important dates or deadlines (in ISO format if possible)
- topics: Array of main topics/themes discussed
- technologies: Array of technologies, tools, or frameworks mentioned
- locations: Array of locations mentioned

Rules:
1. Normalize names (capitalize properly)
2. Remove duplicates
3. Only include entities that appear meaningful (not generic words)
4. Return empty arrays for categories with no matches
5. Format dates as ISO 8601 when possible

Text to analyze:
"""
${text.substring(0, 4000)}
"""

Return ONLY the JSON object, no other text.`;

            const messages = [
                { role: 'system', content: 'You are an expert at extracting structured information from text. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ];

            const response = await llm(messages);

            // Parse the response
            let entities;
            try {
                const content = response.content || response;
                // Try to extract JSON from markdown code blocks if present
                const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
                const jsonText = jsonMatch ? jsonMatch[1] : content;
                entities = JSON.parse(jsonText);
            } catch (parseError) {
                console.warn('[KnowledgeOrganizerService] Failed to parse LLM response, using fallback');
                entities = this._fallbackEntityExtraction(text);
            }

            // Normalize and validate
            entities = {
                projects: Array.isArray(entities.projects) ? entities.projects : [],
                people: Array.isArray(entities.people) ? entities.people : [],
                companies: Array.isArray(entities.companies) ? entities.companies : [],
                dates: Array.isArray(entities.dates) ? entities.dates : [],
                topics: Array.isArray(entities.topics) ? entities.topics : [],
                technologies: Array.isArray(entities.technologies) ? entities.technologies : [],
                locations: Array.isArray(entities.locations) ? entities.locations : []
            };

            return entities;

        } catch (error) {
            console.error('[KnowledgeOrganizerService] Entity extraction failed:', error.message);
            return this._fallbackEntityExtraction(text);
        }
    }

    /**
     * Fallback entity extraction using regex (when LLM not available)
     * @private
     */
    _fallbackEntityExtraction(text) {
        return {
            projects: this._extractPatterns(text, /Project\s+([A-Z][a-zA-Z0-9\s]+)/g),
            people: this._extractPatterns(text, /([A-Z][a-z]+\s+[A-Z][a-z]+)/g),
            companies: [],
            dates: this._extractDates(text),
            topics: [],
            technologies: [],
            locations: []
        };
    }

    /**
     * Extract patterns from text using regex
     * @private
     */
    _extractPatterns(text, regex) {
        const matches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            const value = match[1] || match[0];
            if (value && !matches.includes(value)) {
                matches.push(value.trim());
            }
        }
        return matches.slice(0, 10); // Limit to 10
    }

    /**
     * Extract dates from text
     * @private
     */
    _extractDates(text) {
        const dates = [];
        // Basic date patterns
        const patterns = [
            /\d{4}-\d{2}-\d{2}/g, // ISO format
            /\d{1,2}\/\d{1,2}\/\d{4}/g, // MM/DD/YYYY
            /Q[1-4]\s+\d{4}/g // Q1 2025
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!dates.includes(match[0])) {
                    dates.push(match[0]);
                }
            }
        });

        return dates.slice(0, 5);
    }

    /**
     * Generate a summary of text using LLM
     *
     * @param {string} text - Text to summarize
     * @param {number} maxLength - Maximum summary length (in words)
     * @returns {Promise<string>} Summary
     */
    async generateSummary(text, maxLength = 50) {
        try {
            const llm = await this._getLLMClient();
            if (!llm) {
                // Fallback: Take first N words
                const words = text.split(/\s+/);
                return words.slice(0, maxLength).join(' ') + (words.length > maxLength ? '...' : '');
            }

            const prompt = `Summarize the following text in ${maxLength} words or less. Focus on the main points and key information. Return only the summary, no preamble.

Text:
"""
${text.substring(0, 4000)}
"""`;

            const messages = [
                { role: 'system', content: 'You are an expert at creating concise, informative summaries.' },
                { role: 'user', content: prompt }
            ];

            const response = await llm(messages);
            const summary = (response.content || response).trim();

            return summary;

        } catch (error) {
            console.error('[KnowledgeOrganizerService] Summary generation failed:', error.message);
            // Fallback
            const words = text.split(/\s+/);
            return words.slice(0, maxLength).join(' ') + (words.length > maxLength ? '...' : '');
        }
    }

    /**
     * Generate tags for text using LLM
     *
     * @param {string} text - Text to analyze
     * @param {number} maxTags - Maximum number of tags
     * @returns {Promise<string[]>} Array of tags
     */
    async generateTags(text, maxTags = 5) {
        try {
            const llm = await this._getLLMClient();
            if (!llm) {
                return this._fallbackTagGeneration(text, maxTags);
            }

            const prompt = `Generate ${maxTags} relevant tags for the following text. Tags should be:
- Short (1-3 words)
- Relevant to the main topics
- Useful for categorization and search
- In lowercase with hyphens (e.g., "project-management", "budget-review")

Return ONLY a JSON array of tags, no other text.

Text:
"""
${text.substring(0, 3000)}
"""`;

            const messages = [
                { role: 'system', content: 'You are an expert at generating relevant tags for content categorization. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ];

            const response = await llm(messages);

            // Parse response
            try {
                const content = response.content || response;
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                const jsonText = jsonMatch ? jsonMatch[0] : content;
                const tags = JSON.parse(jsonText);

                if (Array.isArray(tags)) {
                    return tags.slice(0, maxTags);
                }
            } catch (parseError) {
                console.warn('[KnowledgeOrganizerService] Failed to parse tags, using fallback');
            }

            return this._fallbackTagGeneration(text, maxTags);

        } catch (error) {
            console.error('[KnowledgeOrganizerService] Tag generation failed:', error.message);
            return this._fallbackTagGeneration(text, maxTags);
        }
    }

    /**
     * Fallback tag generation using simple keyword extraction
     * @private
     */
    _fallbackTagGeneration(text, maxTags = 5) {
        // Simple approach: Extract most common meaningful words
        const words = text.toLowerCase().split(/\s+/);
        const wordCounts = {};

        // Common stop words to ignore
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);

        words.forEach(word => {
            const cleaned = word.replace(/[^a-z0-9]/g, '');
            if (cleaned.length > 3 && !stopWords.has(cleaned)) {
                wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1;
            }
        });

        // Sort by frequency and take top N
        const sortedWords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxTags)
            .map(([word]) => word);

        return sortedWords;
    }

    /**
     * Create or update an entity in the knowledge graph
     *
     * @param {object} entityData - Entity data
     * @param {string} uid - User ID
     * @returns {Promise<string>} Entity ID
     */
    async createOrUpdateEntity(entityData, uid) {
        const {
            entity_type,    // 'project', 'person', 'company', 'topic', etc.
            entity_name,    // The name of the entity
            entity_value = null,  // Optional value (for dates, etc.)
            related_content_id = null,  // ID of the content that mentions this entity
            confidence = 1.0
        } = entityData;

        if (!entity_type || !entity_name) {
            throw new Error('entity_type and entity_name are required');
        }

        if (!this.db) {
            await this.initialize();
        }

        // Check if entity already exists
        const existing = this.db.prepare(`
            SELECT id, mention_count, first_seen, last_seen, related_entities
            FROM knowledge_graph
            WHERE uid = ? AND entity_type = ? AND entity_name = ?
        `).get(uid, entity_type, entity_name);

        const now = Date.now();

        if (existing) {
            // Update existing entity
            const updatedRelatedEntities = existing.related_entities ? JSON.parse(existing.related_entities) : [];

            // Add new content ID if provided and not already present
            if (related_content_id && !updatedRelatedEntities.includes(related_content_id)) {
                updatedRelatedEntities.push(related_content_id);
            }

            this.db.prepare(`
                UPDATE knowledge_graph
                SET mention_count = mention_count + 1,
                    last_seen = ?,
                    related_entities = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                now,
                JSON.stringify(updatedRelatedEntities),
                now,
                existing.id
            );

            console.log(`[KnowledgeOrganizerService] Updated entity: ${entity_name} (mentions: ${existing.mention_count + 1})`);
            return existing.id;

        } else {
            // Create new entity
            const id = uuidv4();

            const relatedEntities = related_content_id ? [related_content_id] : [];

            this.db.prepare(`
                INSERT INTO knowledge_graph (
                    id, uid, entity_type, entity_name, entity_value,
                    mention_count, confidence, first_seen, last_seen,
                    related_entities, created_at, updated_at, sync_state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                uid,
                entity_type,
                entity_name,
                entity_value,
                1, // Initial mention count
                confidence,
                now,
                now,
                JSON.stringify(relatedEntities),
                now,
                now,
                'clean'
            );

            console.log(`[KnowledgeOrganizerService] Created new entity: ${entity_name} (${entity_type})`);
            return id;
        }
    }

    /**
     * Detect and return all projects for a user
     *
     * @param {string} uid - User ID
     * @param {number} minMentions - Minimum number of mentions to be considered
     * @returns {Promise<object[]>} Array of projects
     */
    async detectProjects(uid, minMentions = 1) {
        if (!this.db) {
            await this.initialize();
        }

        const projects = this.db.prepare(`
            SELECT entity_name, mention_count, first_seen, last_seen, confidence, related_entities
            FROM knowledge_graph
            WHERE uid = ? AND entity_type = 'project' AND mention_count >= ?
            ORDER BY mention_count DESC, last_seen DESC
        `).all(uid, minMentions);

        return projects.map(p => ({
            name: p.entity_name,
            mentionCount: p.mention_count,
            firstSeen: p.first_seen,
            lastSeen: p.last_seen,
            confidence: p.confidence,
            relatedContent: p.related_entities ? JSON.parse(p.related_entities) : []
        }));
    }

    /**
     * Detect and return all people for a user
     *
     * @param {string} uid - User ID
     * @param {number} minMentions - Minimum number of mentions
     * @returns {Promise<object[]>} Array of people
     */
    async detectPeople(uid, minMentions = 1) {
        if (!this.db) {
            await this.initialize();
        }

        const people = this.db.prepare(`
            SELECT entity_name, mention_count, first_seen, last_seen, confidence, related_entities
            FROM knowledge_graph
            WHERE uid = ? AND entity_type = 'person' AND mention_count >= ?
            ORDER BY mention_count DESC, last_seen DESC
        `).all(uid, minMentions);

        return people.map(p => ({
            name: p.entity_name,
            mentionCount: p.mention_count,
            firstSeen: p.first_seen,
            lastSeen: p.last_seen,
            confidence: p.confidence,
            relatedContent: p.related_entities ? JSON.parse(p.related_entities) : []
        }));
    }

    /**
     * Detect and return all topics for a user
     *
     * @param {string} uid - User ID
     * @param {number} minMentions - Minimum number of mentions
     * @returns {Promise<object[]>} Array of topics
     */
    async detectTopics(uid, minMentions = 2) {
        if (!this.db) {
            await this.initialize();
        }

        const topics = this.db.prepare(`
            SELECT entity_name, mention_count, first_seen, last_seen, confidence, related_entities
            FROM knowledge_graph
            WHERE uid = ? AND entity_type = 'topic' AND mention_count >= ?
            ORDER BY mention_count DESC, last_seen DESC
        `).all(uid, minMentions);

        return topics.map(t => ({
            name: t.entity_name,
            mentionCount: t.mention_count,
            firstSeen: t.first_seen,
            lastSeen: t.last_seen,
            confidence: t.confidence,
            relatedContent: t.related_entities ? JSON.parse(t.related_entities) : []
        }));
    }

    /**
     * Get entities by type
     *
     * @param {string} uid - User ID
     * @param {string} entityType - Type of entity
     * @param {object} options - Query options
     * @returns {Promise<object[]>} Array of entities
     */
    async getEntitiesByType(uid, entityType, options = {}) {
        const {
            minMentions = 1,
            limit = 50,
            sortBy = 'mention_count' // or 'last_seen', 'first_seen'
        } = options;

        if (!this.db) {
            await this.initialize();
        }

        const orderBy = sortBy === 'mention_count' ? 'mention_count DESC' :
                        sortBy === 'last_seen' ? 'last_seen DESC' :
                        sortBy === 'first_seen' ? 'first_seen DESC' :
                        'mention_count DESC';

        const entities = this.db.prepare(`
            SELECT *
            FROM knowledge_graph
            WHERE uid = ? AND entity_type = ? AND mention_count >= ?
            ORDER BY ${orderBy}
            LIMIT ?
        `).all(uid, entityType, minMentions, limit);

        return entities.map(e => ({
            id: e.id,
            type: e.entity_type,
            name: e.entity_name,
            value: e.entity_value,
            mentionCount: e.mention_count,
            confidence: e.confidence,
            firstSeen: e.first_seen,
            lastSeen: e.last_seen,
            relatedContent: e.related_entities ? JSON.parse(e.related_entities) : []
        }));
    }

    /**
     * Detect entities in a query (for RAG enhancement)
     *
     * @param {string} query - User query
     * @returns {Promise<string[]>} Array of detected entity names
     */
    async detectEntitiesInQuery(query) {
        try {
            // Quick extraction without LLM for performance
            const entities = this._fallbackEntityExtraction(query);

            // Flatten all entity types into a single array
            const allEntities = [
                ...entities.projects,
                ...entities.people,
                ...entities.companies,
                ...entities.topics
            ];

            return allEntities;
        } catch (error) {
            console.error('[KnowledgeOrganizerService] Query entity detection failed:', error.message);
            return [];
        }
    }

    /**
     * Get knowledge graph statistics for a user
     *
     * @param {string} uid - User ID
     * @returns {Promise<object>} Statistics
     */
    async getKnowledgeGraphStats(uid) {
        if (!this.db) {
            await this.initialize();
        }

        const stats = {
            totalEntities: 0,
            byType: {},
            topProjects: [],
            topPeople: [],
            topTopics: []
        };

        // Total entities
        const total = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM knowledge_graph
            WHERE uid = ?
        `).get(uid);
        stats.totalEntities = total.count;

        // By type
        const byType = this.db.prepare(`
            SELECT entity_type, COUNT(*) as count
            FROM knowledge_graph
            WHERE uid = ?
            GROUP BY entity_type
        `).all(uid);
        byType.forEach(row => {
            stats.byType[row.entity_type] = row.count;
        });

        // Top projects
        stats.topProjects = await this.detectProjects(uid, 1);
        stats.topProjects = stats.topProjects.slice(0, 5);

        // Top people
        stats.topPeople = await this.detectPeople(uid, 1);
        stats.topPeople = stats.topPeople.slice(0, 5);

        // Top topics
        stats.topTopics = await this.detectTopics(uid, 1);
        stats.topTopics = stats.topTopics.slice(0, 5);

        return stats;
    }
}

// Export singleton instance
const knowledgeOrganizerService = new KnowledgeOrganizerService();
module.exports = knowledgeOrganizerService;
