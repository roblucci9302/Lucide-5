/**
 * Phase 2: Auto-Indexing Service
 *
 * Automatically indexes content from multiple sources:
 * - Conversations (sessions)
 * - Screenshots (with OCR)
 * - Audio transcriptions
 * - Important AI responses
 *
 * Extracts entities, generates tags, detects projects, and creates embeddings.
 */

const { loaders } = require('../utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
const { estimateTokens } = require('../utils/tokenUtils');
const logger = require('../utils/logger');
const sqliteClient = require('./sqliteClient');
const conversationHistoryService = require('./conversationHistoryService');
const embeddingProvider = require('./embeddingProvider');
const ocrService = require('./ocrService');
const knowledgeOrganizerService = require('./knowledgeOrganizerService');

/**
 * @class AutoIndexingService
 * @description Service for automatically indexing content from multiple sources
 */
class AutoIndexingService {
    constructor() {
        this.repository = null;
        this.initialized = false;
        this.MIN_MESSAGE_COUNT_FOR_INDEXING = 3; // Minimum messages to consider indexing
        this.IMPORTANCE_THRESHOLD = 0.6; // Minimum importance score to index
        console.log('[AutoIndexingService] Service initialized');
    }

    /**
     * Initialize service
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Repository will be initialized through sqliteClient
            this.initialized = true;
            console.log('[AutoIndexingService] Service ready');
        } catch (error) {
            console.error('[AutoIndexingService] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Index a conversation session
     * @param {string} sessionId - Session ID to index
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Indexing result
     */
    async indexConversation(sessionId, uid) {
        console.log(`[AutoIndexingService] Indexing conversation: ${sessionId}`);

        try {
            // 1. Get session messages
            const messages = await conversationHistoryService.getSessionMessages(sessionId);

            if (!messages || messages.length < this.MIN_MESSAGE_COUNT_FOR_INDEXING) {
                console.log(`[AutoIndexingService] Skipping - too few messages (${messages.length})`);
                return {
                    indexed: false,
                    reason: 'too_few_messages',
                    message_count: messages.length
                };
            }

            // 2. Extract conversation content
            const conversationText = this._extractConversationText(messages);

            if (!conversationText || conversationText.length < 100) {
                console.log('[AutoIndexingService] Skipping - content too short');
                return {
                    indexed: false,
                    reason: 'content_too_short',
                    content_length: conversationText.length
                };
            }

            // 3. Generate summary
            const summary = await this._generateSummary(conversationText);

            // 4. Extract key points (important parts worth indexing)
            const keyPoints = await this._extractKeyPoints(conversationText, messages);

            if (!keyPoints || keyPoints.length === 0) {
                console.log('[AutoIndexingService] No key points found');
                return {
                    indexed: false,
                    reason: 'no_key_points'
                };
            }

            // 5. Extract entities from conversation
            const entities = await this._extractEntities(conversationText);

            // 5b. Save entities to knowledge graph
            const contentId = uuidv4(); // Will be used for the indexed content
            await this._saveEntitiesToKnowledgeGraph(entities, uid, contentId);

            // 6. Generate tags
            const tags = await this._generateTags(conversationText, entities);

            // 7. Detect main project
            const project = this._detectProject(entities);

            // 8. Calculate importance score
            const importanceScore = this._calculateImportance({
                messageCount: messages.length,
                contentLength: conversationText.length,
                entitiesCount: this._countEntities(entities),
                hasKeyPoints: keyPoints.length > 0
            });

            // 9. Generate embedding for semantic search
            const embedding = await this._generateEmbedding(summary || conversationText.substring(0, 1000));

            // 10. Generate title
            const title = await conversationHistoryService.generateTitleFromContent(sessionId);

            // 11. Save to database
            const now = Date.now();
            const indexedContent = {
                id: contentId, // Use the same ID from knowledge graph
                uid,
                source_type: 'conversation',
                source_id: sessionId,
                source_title: title,
                content: conversationText,
                content_summary: summary,
                raw_content: JSON.stringify(messages),
                entities: JSON.stringify(entities),
                tags: JSON.stringify(tags),
                project: project,
                importance_score: importanceScore,
                embedding: embedding ? JSON.stringify(embedding) : null,
                auto_generated: 1,
                indexed_at: now,
                created_at: now,
                updated_at: now,
                sync_state: 'clean'
            };

            await this._saveIndexedContent(indexedContent);

            // 12. Update memory stats
            await this._updateMemoryStats(uid, 'conversation');

            console.log(`[AutoIndexingService] ✅ Conversation indexed: ${sessionId}`);

            return {
                indexed: true,
                content_id: indexedContent.id,
                summary,
                entities,
                tags,
                project,
                importance_score: importanceScore,
                key_points_count: keyPoints.length
            };
        } catch (error) {
            console.error('[AutoIndexingService] Error indexing conversation:', error);
            return {
                indexed: false,
                reason: 'error',
                error: error.message
            };
        }
    }

    /**
     * Index a screenshot with OCR
     * @param {string} screenshotPath - Path to screenshot file
     * @param {string} uid - User ID
     * @param {string} sessionId - Optional session ID for context
     * @returns {Promise<Object>} Indexing result
     */
    async indexScreenshot(screenshotPath, uid, sessionId = null) {
        console.log(`[AutoIndexingService] Indexing screenshot: ${screenshotPath}`);

        try {
            // 1. Perform OCR to extract text
            const extractedText = await this._performOCR(screenshotPath);

            if (!extractedText || extractedText.length < 20) {
                console.log('[AutoIndexingService] Skipping - no text extracted from screenshot');
                return {
                    indexed: false,
                    reason: 'no_text_extracted'
                };
            }

            // 2. Extract entities
            const entities = await this._extractEntities(extractedText);

            // 2b. Save entities to knowledge graph
            const contentId = uuidv4();
            await this._saveEntitiesToKnowledgeGraph(entities, uid, contentId);

            // 3. Generate tags
            const tags = await this._generateTags(extractedText, entities);

            // 4. Detect project
            const project = this._detectProject(entities);

            // 5. Calculate importance
            const importanceScore = this._calculateImportance({
                contentLength: extractedText.length,
                entitiesCount: this._countEntities(entities),
                hasContext: sessionId !== null
            });

            // 6. Generate embedding
            const embedding = await this._generateEmbedding(extractedText);

            // 7. Generate title
            const title = this._generateScreenshotTitle(extractedText, entities);

            // 8. Save to database
            const now = Date.now();
            const indexedContent = {
                id: contentId, // Use the same ID from knowledge graph
                uid,
                source_type: 'screenshot',
                source_id: sessionId,
                source_title: title,
                content: extractedText,
                content_summary: extractedText.substring(0, 200),
                raw_content: null, // Original image not stored as text
                entities: JSON.stringify(entities),
                tags: JSON.stringify(tags),
                project: project,
                importance_score: importanceScore,
                embedding: embedding ? JSON.stringify(embedding) : null,
                auto_generated: 1,
                indexed_at: now,
                created_at: now,
                updated_at: now,
                sync_state: 'clean'
            };

            await this._saveIndexedContent(indexedContent);

            // 9. Update memory stats
            await this._updateMemoryStats(uid, 'screenshot');

            console.log(`[AutoIndexingService] ✅ Screenshot indexed`);

            return {
                indexed: true,
                content_id: indexedContent.id,
                text_extracted: extractedText,
                entities,
                tags,
                project,
                importance_score: importanceScore
            };
        } catch (error) {
            console.error('[AutoIndexingService] Error indexing screenshot:', error);
            return {
                indexed: false,
                reason: 'error',
                error: error.message
            };
        }
    }

    /**
     * Index an audio transcription session
     * @param {string} sessionId - Session ID
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Indexing result
     */
    async indexAudioSession(sessionId, uid) {
        console.log(`[AutoIndexingService] Indexing audio session: ${sessionId}`);

        try {
            // 1. Get transcriptions from session
            const db = sqliteClient.getDatabase();
            const transcripts = db.prepare(`
                SELECT * FROM transcripts
                WHERE session_id = ?
                ORDER BY start_at ASC
            `).all(sessionId);

            if (!transcripts || transcripts.length === 0) {
                console.log('[AutoIndexingService] No transcripts found');
                return {
                    indexed: false,
                    reason: 'no_transcripts'
                };
            }

            // 2. Assemble full text
            const fullText = transcripts.map(t => t.text).join(' ');

            if (fullText.length < 100) {
                console.log('[AutoIndexingService] Transcript too short');
                return {
                    indexed: false,
                    reason: 'transcript_too_short'
                };
            }

            // 3. Generate summary
            const summary = await this._generateSummary(fullText);

            // 4. Analyze speakers in detail
            const speakerAnalysis = this._analyzeSpeakers(transcripts);

            // 5. Extract actions and decisions
            const actionsDecisions = this._extractActionsAndDecisions(fullText);

            // 6. Extract entities
            const entities = await this._extractEntities(fullText);

            // Add speakers to entities
            if (speakerAnalysis.speakers.length > 0) {
                entities.speakers = speakerAnalysis.speakers.map(s => s.name);
            }

            // Add actions/decisions to entities if found
            if (actionsDecisions.hasActions || actionsDecisions.hasDecisions) {
                entities.actions = actionsDecisions.actions;
                entities.decisions = actionsDecisions.decisions;
            }

            // 6b. Save entities to knowledge graph
            const contentId = uuidv4();
            await this._saveEntitiesToKnowledgeGraph(entities, uid, contentId);

            // 7. Generate topics/tags
            const topics = await this._generateTags(fullText, entities);

            // 8. Detect project
            const project = this._detectProject(entities);

            // 9. Calculate importance (enhanced for audio)
            const importanceScore = this._calculateImportance({
                contentLength: fullText.length,
                entitiesCount: this._countEntities(entities),
                speakerCount: speakerAnalysis.speakerCount,
                transcriptCount: transcripts.length,
                hasActions: actionsDecisions.hasActions,
                hasDecisions: actionsDecisions.hasDecisions,
                duration: speakerAnalysis.totalDuration
            });

            // 8. Generate embedding
            const embedding = await this._generateEmbedding(summary || fullText.substring(0, 1000));

            // 9. Generate title
            const title = `Audio: ${summary?.substring(0, 60) || 'Transcription'}`;

            // 10. Save to database with enhanced metadata
            const now = Date.now();

            // Build enhanced entities object with speaker analysis
            const enhancedEntities = {
                ...entities,
                speakerAnalysis: speakerAnalysis,
                actionsDecisions: actionsDecisions
            };

            const indexedContent = {
                id: contentId, // Use the same ID from knowledge graph
                uid,
                source_type: 'audio',
                source_id: sessionId,
                source_title: title,
                content: fullText,
                content_summary: summary,
                raw_content: JSON.stringify(transcripts),
                entities: JSON.stringify(enhancedEntities),
                tags: JSON.stringify(topics),
                project: project,
                importance_score: importanceScore,
                embedding: embedding ? JSON.stringify(embedding) : null,
                auto_generated: 1,
                indexed_at: now,
                created_at: now,
                updated_at: now,
                sync_state: 'clean'
            };

            await this._saveIndexedContent(indexedContent);

            // 11. Update memory stats
            await this._updateMemoryStats(uid, 'audio');

            console.log(`[AutoIndexingService] ✅ Audio session indexed`);
            console.log(`[AutoIndexingService]    - Speakers: ${speakerAnalysis.speakerCount}`);
            console.log(`[AutoIndexingService]    - Actions: ${actionsDecisions.actions.length}`);
            console.log(`[AutoIndexingService]    - Decisions: ${actionsDecisions.decisions.length}`);

            return {
                indexed: true,
                content_id: indexedContent.id,
                summary,
                entities: enhancedEntities,
                topics,
                project,
                speakerAnalysis: speakerAnalysis,
                actionsDecisions: actionsDecisions,
                importance_score: importanceScore
            };
        } catch (error) {
            console.error('[AutoIndexingService] Error indexing audio:', error);
            return {
                indexed: false,
                reason: 'error',
                error: error.message
            };
        }
    }

    /**
     * Analyze speakers in audio transcripts
     * @param {Array} transcripts - Array of transcript objects
     * @returns {Object} Speaker analysis
     * @private
     */
    _analyzeSpeakers(transcripts) {
        const speakerStats = {};
        const timeline = [];

        transcripts.forEach((transcript, index) => {
            const speaker = transcript.speaker || 'Unknown';

            // Initialize speaker stats
            if (!speakerStats[speaker]) {
                speakerStats[speaker] = {
                    name: speaker,
                    wordCount: 0,
                    segments: 0,
                    totalDuration: 0,
                    firstAppearance: transcript.start_at,
                    lastAppearance: transcript.end_at
                };
            }

            // Update stats
            const wordCount = transcript.text.split(/\s+/).length;
            const duration = (transcript.end_at - transcript.start_at) || 0;

            speakerStats[speaker].wordCount += wordCount;
            speakerStats[speaker].segments += 1;
            speakerStats[speaker].totalDuration += duration;
            speakerStats[speaker].lastAppearance = transcript.end_at;

            // Build timeline
            timeline.push({
                speaker: speaker,
                text: transcript.text.substring(0, 100), // First 100 chars
                start: transcript.start_at,
                end: transcript.end_at,
                index: index
            });
        });

        // Calculate percentages
        const totalWords = Object.values(speakerStats).reduce((sum, s) => sum + s.wordCount, 0);
        const totalDuration = Object.values(speakerStats).reduce((sum, s) => sum + s.totalDuration, 0);

        Object.values(speakerStats).forEach(stats => {
            stats.wordPercentage = totalWords > 0 ? (stats.wordCount / totalWords * 100).toFixed(1) : 0;
            stats.durationPercentage = totalDuration > 0 ? (stats.totalDuration / totalDuration * 100).toFixed(1) : 0;
        });

        return {
            speakers: Object.values(speakerStats),
            speakerCount: Object.keys(speakerStats).length,
            timeline: timeline,
            totalWords: totalWords,
            totalDuration: totalDuration
        };
    }

    /**
     * Extract action items and decisions from text
     * @param {string} text - Text to analyze
     * @returns {Object} Extracted actions and decisions
     * @private
     */
    _extractActionsAndDecisions(text) {
        const actions = [];
        const decisions = [];

        // Action keywords
        const actionKeywords = [
            'action:', 'todo:', 'to do:', 'task:', 'follow up:',
            'we need to', 'we should', 'we must', 'we will',
            'je dois', 'il faut', 'nous devons', 'à faire'
        ];

        // Decision keywords
        const decisionKeywords = [
            'decided', 'decision:', 'agreed', 'conclusion:',
            'décidé', 'décision:', 'accord', 'conclusion:'
        ];

        // Split into sentences
        const sentences = text.split(/[.!?]+/);

        sentences.forEach(sentence => {
            const lowerSentence = sentence.toLowerCase().trim();

            // Check for actions
            if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
                const cleaned = sentence.trim();
                if (cleaned.length > 10 && actions.length < 5) {
                    actions.push(cleaned);
                }
            }

            // Check for decisions
            if (decisionKeywords.some(keyword => lowerSentence.includes(keyword))) {
                const cleaned = sentence.trim();
                if (cleaned.length > 10 && decisions.length < 5) {
                    decisions.push(cleaned);
                }
            }
        });

        return {
            actions: actions,
            decisions: decisions,
            hasActions: actions.length > 0,
            hasDecisions: decisions.length > 0
        };
    }

    /**
     * Check if a conversation should be indexed
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Should index
     */
    async shouldIndexConversation(sessionId) {
        try {
            const messages = await conversationHistoryService.getSessionMessages(sessionId);
            return messages && messages.length >= this.MIN_MESSAGE_COUNT_FOR_INDEXING;
        } catch (error) {
            console.error('[AutoIndexingService] Error checking if should index:', error);
            return false;
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Extract conversation text from messages
     * @private
     */
    _extractConversationText(messages) {
        return messages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n\n');
    }

    /**
     * Generate summary using LLM
     * @private
     */
    async _generateSummary(text) {
        try {
            const summary = await knowledgeOrganizerService.generateSummary(text, 50);
            return summary;
        } catch (error) {
            console.error('[AutoIndexingService] Summary generation failed:', error.message);
            // Fallback: return first 200 chars
            const summary = text.substring(0, 200);
            return summary.length < text.length ? summary + '...' : summary;
        }
    }

    /**
     * Extract key points from conversation
     * @private
     */
    async _extractKeyPoints(conversationText, messages) {
        // TODO: Implement LLM-based key points extraction
        // For now, extract AI responses > 200 chars as key points
        const keyPoints = messages
            .filter(msg => msg.role === 'assistant' && msg.content.length > 200)
            .map(msg => msg.content);

        return keyPoints;
    }

    /**
     * Extract entities from text using LLM
     * @private
     */
    async _extractEntities(text) {
        try {
            const entities = await knowledgeOrganizerService.extractEntities(text);
            return entities;
        } catch (error) {
            console.error('[AutoIndexingService] Entity extraction failed:', error.message);
            // Return empty structure as fallback
            return {
                projects: [],
                people: [],
                companies: [],
                dates: [],
                locations: [],
                technologies: [],
                topics: []
            };
        }
    }

    /**
     * Generate tags using LLM
     * @private
     */
    async _generateTags(text, entities) {
        try {
            const tags = await knowledgeOrganizerService.generateTags(text, 5);
            return tags;
        } catch (error) {
            console.error('[AutoIndexingService] Tag generation failed:', error.message);
            // Fallback: extract tags from entities
            const tags = [];

            if (entities.projects) tags.push(...entities.projects);
            if (entities.topics) tags.push(...entities.topics);
            if (entities.technologies) tags.push(...entities.technologies);

            return [...new Set(tags)]; // Remove duplicates
        }
    }

    /**
     * Detect main project from entities
     * @private
     */
    _detectProject(entities) {
        if (entities.projects && entities.projects.length > 0) {
            return entities.projects[0]; // Return first project
        }
        return null;
    }

    /**
     * Calculate importance score
     * @private
     * @param {Object} factors - Various factors to consider
     * @returns {number} Importance score between 0 and 1
     */
    _calculateImportance(factors) {
        let score = 0.5; // Base score

        // Adjust based on factors

        // Content volume
        if (factors.messageCount) {
            score += Math.min(factors.messageCount / 20, 0.15); // Up to +0.15 for many messages
        }

        if (factors.contentLength) {
            score += Math.min(factors.contentLength / 5000, 0.15); // Up to +0.15 for long content
        }

        // Entity richness
        if (factors.entitiesCount) {
            score += Math.min(factors.entitiesCount / 10, 0.15); // Up to +0.15 for many entities
        }

        // Content quality indicators
        if (factors.hasKeyPoints) {
            score += 0.1; // Has key points identified
        }

        if (factors.hasContext) {
            score += 0.05; // Has contextual information
        }

        // Audio-specific factors
        if (factors.speakerCount) {
            if (factors.speakerCount > 1) {
                score += 0.1; // Multi-speaker conversation (meeting/interview)
            }
            if (factors.speakerCount >= 4) {
                score += 0.05; // Large meeting/conference
            }
        }

        if (factors.transcriptCount && factors.transcriptCount > 50) {
            score += 0.05; // Long audio session
        }

        if (factors.duration && factors.duration > 600000) { // > 10 minutes
            score += 0.05; // Long duration audio
        }

        // Actionable content (high value)
        if (factors.hasActions) {
            score += 0.15; // Contains action items
        }

        if (factors.hasDecisions) {
            score += 0.15; // Contains decisions
        }

        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Count total entities
     * @private
     */
    _countEntities(entities) {
        let count = 0;
        for (const key in entities) {
            if (Array.isArray(entities[key])) {
                count += entities[key].length;
            }
        }
        return count;
    }

    /**
     * Generate embedding for text
     * @private
     */
    async _generateEmbedding(text) {
        try {
            return await embeddingProvider.generateEmbedding(text);
        } catch (error) {
            console.warn('[AutoIndexingService] Error generating embedding:', error);
            return null; // Non-blocking - continue without embedding
        }
    }

    /**
     * Perform OCR on screenshot
     * @private
     */
    async _performOCR(screenshotPath) {
        try {
            console.log('[AutoIndexingService] Performing OCR on screenshot...');

            // Check if OCR is supported
            const isSupported = await ocrService.isSupported();
            if (!isSupported) {
                console.warn('[AutoIndexingService] OCR not available - Tesseract.js not installed');
                console.warn('[AutoIndexingService] To enable OCR, run: npm install tesseract.js');
                return null;
            }

            // Extract text from image
            const result = await ocrService.extractTextFromImage(screenshotPath, {
                language: 'eng', // TODO: Auto-detect language or get from user settings
                oem: 1, // Neural nets LSTM engine
                psm: 3  // Fully automatic page segmentation
            });

            if (!result.success) {
                console.error('[AutoIndexingService] OCR failed:', result.error);
                return null;
            }

            // Check confidence threshold
            if (result.confidence < 30) {
                console.warn(`[AutoIndexingService] Low OCR confidence: ${result.confidence.toFixed(2)}%`);
                console.warn('[AutoIndexingService] Text may be inaccurate');
            }

            console.log(`[AutoIndexingService] ✅ OCR successful: ${result.text.length} chars extracted`);
            console.log(`[AutoIndexingService] Confidence: ${result.confidence.toFixed(2)}%`);

            return result.text;

        } catch (error) {
            console.error('[AutoIndexingService] Error performing OCR:', error);
            return null;
        }
    }

    /**
     * Generate title for screenshot
     * @private
     */
    _generateScreenshotTitle(text, entities) {
        // Use first entity or first words of text
        if (entities.projects && entities.projects.length > 0) {
            return `Screenshot: ${entities.projects[0]}`;
        }

        const firstWords = text.split(' ').slice(0, 8).join(' ');
        return `Screenshot: ${firstWords}${text.split(' ').length > 8 ? '...' : ''}`;
    }

    /**
     * Save indexed content to database
     * @private
     */
    async _saveIndexedContent(content) {
        const db = sqliteClient.getDatabase();

        const columns = Object.keys(content);
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(content);

        const query = `
            INSERT INTO auto_indexed_content (${columns.join(', ')})
            VALUES (${placeholders})
        `;

        db.prepare(query).run(...values);
    }

    /**
     * Update memory statistics
     * @private
     */
    async _updateMemoryStats(uid, sourceType) {
        const db = sqliteClient.getDatabase();
        const now = Date.now();

        // Check if stats exist
        const existing = db.prepare('SELECT * FROM memory_stats WHERE uid = ?').get(uid);

        if (existing) {
            // Update existing stats
            const fieldMap = {
                'conversation': 'conversations_indexed',
                'screenshot': 'screenshots_indexed',
                'audio': 'audio_indexed',
                'ai_response': 'ai_responses_indexed'
            };

            const field = fieldMap[sourceType];

            db.prepare(`
                UPDATE memory_stats
                SET ${field} = ${field} + 1,
                    total_elements = total_elements + 1,
                    last_indexed_at = ?,
                    updated_at = ?
                WHERE uid = ?
            `).run(now, now, uid);
        } else {
            // Create new stats
            const fieldMap = {
                'conversation': { conversations_indexed: 1 },
                'screenshot': { screenshots_indexed: 1 },
                'audio': { audio_indexed: 1 },
                'ai_response': { ai_responses_indexed: 1 }
            };

            const counts = fieldMap[sourceType];

            db.prepare(`
                INSERT INTO memory_stats (
                    uid, total_elements, ${Object.keys(counts)[0]},
                    last_indexed_at, created_at, updated_at, sync_state
                )
                VALUES (?, 1, 1, ?, ?, ?, 'clean')
            `).run(uid, now, now, now);
        }
    }

    /**
     * Save entities to knowledge graph
     * @private
     */
    async _saveEntitiesToKnowledgeGraph(entities, uid, contentId) {
        try {
            // Save projects
            if (entities.projects && entities.projects.length > 0) {
                for (const project of entities.projects.slice(0, 5)) { // Limit to 5
                    await knowledgeOrganizerService.createOrUpdateEntity({
                        entity_type: 'project',
                        entity_name: project,
                        related_content_id: contentId
                    }, uid);
                }
            }

            // Save people
            if (entities.people && entities.people.length > 0) {
                for (const person of entities.people.slice(0, 10)) { // Limit to 10
                    await knowledgeOrganizerService.createOrUpdateEntity({
                        entity_type: 'person',
                        entity_name: person,
                        related_content_id: contentId
                    }, uid);
                }
            }

            // Save companies
            if (entities.companies && entities.companies.length > 0) {
                for (const company of entities.companies.slice(0, 5)) {
                    await knowledgeOrganizerService.createOrUpdateEntity({
                        entity_type: 'company',
                        entity_name: company,
                        related_content_id: contentId
                    }, uid);
                }
            }

            // Save topics
            if (entities.topics && entities.topics.length > 0) {
                for (const topic of entities.topics.slice(0, 5)) {
                    await knowledgeOrganizerService.createOrUpdateEntity({
                        entity_type: 'topic',
                        entity_name: topic,
                        related_content_id: contentId
                    }, uid);
                }
            }

            // Save technologies
            if (entities.technologies && entities.technologies.length > 0) {
                for (const tech of entities.technologies.slice(0, 5)) {
                    await knowledgeOrganizerService.createOrUpdateEntity({
                        entity_type: 'technology',
                        entity_name: tech,
                        related_content_id: contentId
                    }, uid);
                }
            }

            // Save dates (as topics with value)
            if (entities.dates && entities.dates.length > 0) {
                for (const date of entities.dates.slice(0, 3)) {
                    await knowledgeOrganizerService.createOrUpdateEntity({
                        entity_type: 'date',
                        entity_name: `Date: ${date}`,
                        entity_value: date,
                        related_content_id: contentId
                    }, uid);
                }
            }

            console.log(`[AutoIndexingService] Saved entities to knowledge graph for content ${contentId}`);
        } catch (error) {
            console.error('[AutoIndexingService] Failed to save entities to knowledge graph:', error.message);
            // Don't throw - this is not critical for indexing
        }
    }
}

// Singleton instance
const autoIndexingService = new AutoIndexingService();

module.exports = autoIndexingService;
