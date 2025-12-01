/**
 * Live Insights Service - Phase 3.1 + 3.4 + 3.3
 * Real-time analysis of conversation to detect patterns, decisions, actions, and key moments
 * Enhanced with AI-powered contextual analysis and intelligent notifications
 */

const EventEmitter = require('events');
const contextualAnalysisService = require('./contextualAnalysisService');
const notificationService = require('./notificationService');

/**
 * Insight Types
 */
const InsightType = {
    DECISION: 'decision',           // Decision made during meeting
    ACTION: 'action',               // Action item assigned verbally
    DEADLINE: 'deadline',           // Deadline mentioned
    QUESTION: 'question',           // Open question asked
    KEY_POINT: 'key_point',        // Important point to remember
    BLOCKER: 'blocker',            // Obstacle or blocker mentioned
    TOPIC_CHANGE: 'topic_change',  // Change in discussion topic
    RECURRING_TOPIC: 'recurring'    // Topic mentioned multiple times
};

/**
 * Priority Levels
 */
const Priority = {
    HIGH: 'high',       // Critical insights requiring immediate attention
    MEDIUM: 'medium',   // Important but not urgent
    LOW: 'low'         // Nice to know
};

class LiveInsightsService extends EventEmitter {
    constructor() {
        super();
        this.sessionId = null;
        this.insights = [];
        // Fix MEDIUM BUG-M1: Add Map for O(1) insight lookup instead of O(n) Array.find()
        this.insightsById = new Map(); // Fast lookup by insight ID
        this.recurringTopicsMap = new Map(); // Fast lookup for recurring topics by topic name
        this.conversationBuffer = [];
        this.topicHistory = new Map(); // Track topic frequency
        // Fix MEDIUM BUG-M6: Use Array for FIFO behavior
        // Fix HIGH MEDIUM BUG-M11: Add Set for O(1) duplicate checking to avoid O(n²) complexity
        this.questionTracker = []; // Track open questions with FIFO limit (order)
        this.questionSet = new Set(); // Fast O(1) duplicate lookup
        this.turnCounter = 0; // Track conversation turns for AI analysis

        // Configuration constants
        this.MAX_TRACKED_QUESTIONS = 100; // Limit questions to prevent memory overflow

        // Fix HIGH BUG-H3: Add limit for insights array to prevent unbounded memory growth
        // Limit insights to 500 for long meetings while maintaining useful history
        this.MAX_INSIGHTS = 500;

        // Fix NORMAL MEDIUM BUG-M19: Extract proactive suggestions trigger threshold
        // Generate AI suggestions every 5 conversation turns to avoid overwhelming the user
        // Balance between helpfulness and not being too intrusive
        this.PROACTIVE_SUGGESTIONS_INTERVAL = 5; // Every 5 conversation turns

        // Fix NORMAL MEDIUM BUG-M23: Extract recurring topic threshold
        // Mark a topic as recurring when mentioned 3+ times - indicates importance
        this.RECURRING_TOPIC_THRESHOLD = 3;

        // Fix LOW BUG-L2: Extract magic numbers as named constants
        this.CONVERSATION_BUFFER_SIZE = 10; // Keep last 10 turns for context
        this.KEY_PHRASE_MAX_LENGTH = 60; // Standard max length for insight summaries
        this.QUESTION_MAX_LENGTH = 80; // Questions can be slightly longer
        this.TOPIC_NAME_MAX_LENGTH = 40; // Topic names should be concise

        // Pattern detection configuration
        this.patterns = this._initializePatterns();

        console.log('[LiveInsightsService] Initialized');
    }

    /**
     * Initialize regex patterns for insight detection
     * @private
     */
    _initializePatterns() {
        return {
            // Decision patterns
            decision: [
                /\b(decided|agree[sd]?|concluded|determined|resolved)\b/i,
                /\b(let'?s (go with|use|choose|pick))\b/i,
                /\b(final decision|we'?ll|we will)\b/i,
                /\b(approved|accepted|confirmed)\b/i
            ],

            // Action patterns (EN + FR)
            action: [
                /\b(will|gonna|going to|need to|should|must|have to)\s+\w+/i,
                /\b(I'?ll|he'?ll|she'?ll|they'?ll|we'?ll)\s+\w+/i,
                /\b(responsible for|assigned to|in charge of)\b/i,
                /\b(action item|task|todo|to-?do)\b/i,
                // French action patterns
                /\b(il faut|doit|devra|dois|devons|devez)\b/i,
                /\b(tu peux|peux-tu|pouvez-vous|pourriez-vous)\s+\w+/i,
                /\b(n'oublie[zs]? pas|pensez à|pense à)/i,
                /\b(finis|termine|prépare|regarde|vérifie|envoie|contacte)\b/i
            ],

            // Deadline patterns (EN + FR)
            deadline: [
                /\b(by|before|until|deadline|due)\s+(tomorrow|today|tonight|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
                /\b(by|before|until|deadline|due)\s+\w+\s+\d{1,2}/i, // "by March 15"
                /\b(asap|urgent|immediately|right away)\b/i,
                /\b(\d{1,2}:\d{2}\s*[ap]m)\b/i, // Time mentions
                /\b(in\s+\d+\s+(hours?|days?|weeks?|months?))/i,
                // French deadline patterns
                /\b(pour|avant|d'ici)\s+(demain|aujourd'hui|ce soir|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i,
                /\b(pour|avant|d'ici)\s+(cette semaine|la semaine prochaine|le mois prochain)/i,
                /\b(pour|avant|d'ici)\s+le\s+\d{1,2}/i, // "pour le 15"
                /\b(dans\s+\d+\s+(heures?|jours?|semaines?|mois))/i
            ],

            // Question patterns
            question: [
                /\b(what|when|where|who|why|how|which|can|could|would|should|do|does|did|is|are|was|were)\b.*\?/i,
                /\b(question|wondering|curious|need to know|clarify)\b/i
            ],

            // Key point patterns
            keyPoint: [
                /\b(important|critical|crucial|key|essential|vital|significant)\b/i,
                /\b(note that|keep in mind|remember|don'?t forget)\b/i,
                /\b(the main|the primary|the core|the key)\b/i
            ],

            // Blocker patterns
            blocker: [
                /\b(blocked|blocker|stuck|can'?t|cannot|unable to|issue|problem)\b/i,
                /\b(waiting for|dependency|depends on|blocked by)\b/i,
                /\b(obstacle|impediment|bottleneck)\b/i
            ]
        };
    }

    /**
     * Set the current session ID
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        this.reset();
        console.log(`[LiveInsightsService] Session set: ${sessionId}`);
    }

    /**
     * Reset service state
     */
    reset() {
        this.insights = [];
        this.conversationBuffer = [];
        this.topicHistory.clear();
        this.questionTracker = []; // Fix MEDIUM BUG-M6: Clear array
        this.questionSet.clear(); // Fix HIGH MEDIUM BUG-M11: Clear set
        this.turnCounter = 0;
        contextualAnalysisService.reset(); // Reset AI analysis context
        notificationService.reset(); // Reset notifications (Phase 3.3)
        console.log('[LiveInsightsService] State reset');
    }

    /**
     * Fix HIGH BUG-H3: Add insight with FIFO limit to prevent unbounded growth
     * Fix MEDIUM BUG-M1: Update Maps when adding/removing insights
     * @param {Object} insight - Insight object to add
     * @private
     */
    _addInsightWithLimit(insight) {
        // Check if insights array has reached limit
        if (this.insights.length >= this.MAX_INSIGHTS) {
            // Remove oldest insight (FIFO)
            const removed = this.insights.shift();
            // Fix MEDIUM BUG-M1: Remove from Maps too
            this.insightsById.delete(removed.id);
            if (removed.type === InsightType.RECURRING_TOPIC && removed.metadata?.topic) {
                this.recurringTopicsMap.delete(removed.metadata.topic);
            }
            console.log(`[LiveInsights] Evicted oldest insight (ID: ${removed.id}) to maintain memory limit`);
        }
        this.insights.push(insight);
        // Fix MEDIUM BUG-M1: Add to Maps for O(1) lookup
        this.insightsById.set(insight.id, insight);
        if (insight.type === InsightType.RECURRING_TOPIC && insight.metadata?.topic) {
            this.recurringTopicsMap.set(insight.metadata.topic, insight);
        }
    }

    /**
     * Process new conversation turn
     * @param {string} speaker - Speaker identifier
     * @param {string} text - Transcribed text
     */
    async processConversationTurn(speaker, text) {
        // Validate inputs
        if (!text || typeof text !== 'string') {
            console.warn('[LiveInsightsService] Invalid text parameter, skipping');
            return;
        }

        const normalizedSpeaker = speaker.toLowerCase();
        if (!['me', 'them'].includes(normalizedSpeaker)) {
            console.warn(`[LiveInsightsService] Invalid speaker "${speaker}", skipping`);
            return;
        }

        if (!this.sessionId) {
            console.warn('[LiveInsightsService] No session ID set, skipping processing');
            return;
        }

        // Add to buffer
        this.conversationBuffer.push({ speaker: normalizedSpeaker, text, timestamp: Date.now() });

        // Fix LOW BUG-L2: Use constant instead of magic number
        if (this.conversationBuffer.length > this.CONVERSATION_BUFFER_SIZE) {
            this.conversationBuffer.shift();
        }

        // Fix MEDIUM BUG-M6: Removed inefficient Set → Array → Set conversion
        // Question limiting now handled when adding questions (see _analyzeConversationTurn)

        // Add to contextual analysis service for AI-powered insights
        try {
            contextualAnalysisService.addConversationTurn(normalizedSpeaker, text);
        } catch (error) {
            console.error('[LiveInsights] Failed to add conversation turn to contextual analysis:', error);
        }

        this.turnCounter++;

        // Analyze the turn (await for proper error handling)
        try {
            await this._analyzeConversationTurn(normalizedSpeaker, text);
        } catch (error) {
            console.error('[LiveInsights] Failed to analyze conversation turn:', error);
        }

        // Fix NORMAL MEDIUM BUG-M19: Use constant for proactive suggestions interval
        if (this.turnCounter % this.PROACTIVE_SUGGESTIONS_INTERVAL === 0) {
            this._generateProactiveSuggestions().catch(error => {
                console.error('[LiveInsights] Failed to generate proactive suggestions:', error);
            });
        }
    }

    /**
     * Analyze a conversation turn for insights
     * @private
     */
    async _analyzeConversationTurn(speaker, text) {
        const insights = [];

        // Fix MEDIUM BUG-M2: Quick pre-filter to skip pattern matching for casual conversation
        // Only run expensive pattern checks if message contains insight-worthy keywords
        // Pre-filter keywords (EN + FR) to skip expensive pattern matching for casual conversation
        const insightKeywords = /\b(decide|decision|agree|will|going to|need to|should|must|have to|deadline|by|before|until|due|asap|urgent|question|what|when|where|who|why|how|important|critical|crucial|key|blocked|blocker|stuck|can't|cannot|issue|problem|let's talk|moving on|next topic|il faut|doit|devra|dois|devons|devez|tu peux|peux-tu|pouvez-vous|n'oublie|pensez à|pense à|finis|termine|prépare|regarde|vérifie|pour|avant|d'ici|demain|aujourd'hui|cette semaine|la semaine prochaine|urgent|critique|absolument|réunion|client)\b/i;

        const hasInsightKeywords = insightKeywords.test(text);

        // Always check for topic changes (lightweight check)
        const topicChanged = this._detectTopicChange(text);
        if (topicChanged) {
            insights.push(this._createInsight(
                InsightType.TOPIC_CHANGE,
                `Topic shift: ${topicChanged}`,
                text,
                speaker,
                Priority.LOW
            ));
        }

        // Skip expensive pattern matching if no insight keywords found
        if (!hasInsightKeywords) {
            // Still emit topic change insights if found
            if (insights.length > 0) {
                for (const insight of insights) {
                    this._addInsightWithLimit(insight); // Fix HIGH BUG-H3
                    this.emit('insight-detected', insight);
                    notificationService.notifyInsight(insight);
                }
            }
            return;
        }

        // Detect decisions
        if (this._matchesPattern(text, this.patterns.decision)) {
            insights.push(this._createInsight(
                InsightType.DECISION,
                `Decision: ${this._extractKeyPhrase(text, this.KEY_PHRASE_MAX_LENGTH)}`,
                text,
                speaker,
                this._calculatePriority(text, InsightType.DECISION)
            ));
        }

        // Detect actions
        if (this._matchesPattern(text, this.patterns.action)) {
            insights.push(this._createInsight(
                InsightType.ACTION,
                `Action: ${this._extractKeyPhrase(text, this.KEY_PHRASE_MAX_LENGTH)}`,
                text,
                speaker,
                this._calculatePriority(text, InsightType.ACTION)
            ));
        }

        // Detect deadlines
        if (this._matchesPattern(text, this.patterns.deadline)) {
            insights.push(this._createInsight(
                InsightType.DEADLINE,
                `Deadline mentioned: ${this._extractDeadline(text)}`,
                text,
                speaker,
                Priority.HIGH // Deadlines are always high priority
            ));
        }

        // Detect questions
        if (this._matchesPattern(text, this.patterns.question)) {
            const question = this._extractKeyPhrase(text, this.QUESTION_MAX_LENGTH);

            // Fix MEDIUM BUG-M6 + HIGH MEDIUM BUG-M11: Efficient FIFO with O(1) duplicate check
            // Use Set for O(1) duplicate check instead of Array.includes() which is O(n)
            if (!this.questionSet.has(question)) {
                // If at max capacity, remove oldest question (FIFO)
                if (this.questionTracker.length >= this.MAX_TRACKED_QUESTIONS) {
                    const removed = this.questionTracker.shift();
                    this.questionSet.delete(removed); // Keep set in sync
                }
                this.questionTracker.push(question);
                this.questionSet.add(question); // O(1) add to set
            }

            insights.push(this._createInsight(
                InsightType.QUESTION,
                `Question: ${question}`,
                text,
                speaker,
                Priority.MEDIUM
            ));
        }

        // Detect key points
        if (this._matchesPattern(text, this.patterns.keyPoint)) {
            insights.push(this._createInsight(
                InsightType.KEY_POINT,
                `Key Point: ${this._extractKeyPhrase(text, this.KEY_PHRASE_MAX_LENGTH)}`,
                text,
                speaker,
                Priority.MEDIUM
            ));
        }

        // Detect blockers
        if (this._matchesPattern(text, this.patterns.blocker)) {
            insights.push(this._createInsight(
                InsightType.BLOCKER,
                `Blocker: ${this._extractKeyPhrase(text, this.KEY_PHRASE_MAX_LENGTH)}`,
                text,
                speaker,
                Priority.HIGH // Blockers are high priority
            ));
        }

        // Fix MEDIUM BUG-M2: Topic change detection moved to pre-filter section (above)

        // Store and emit insights (with AI enrichment for high-priority ones)
        // Use for...of instead of forEach to properly handle async/await and prevent race conditions
        for (const insight of insights) {
            let finalInsight = insight;

            // Enrich high-priority insights with AI analysis
            if (insight.priority === Priority.HIGH) {
                try {
                    finalInsight = await contextualAnalysisService.enrichInsight(insight);
                    console.log(`[LiveInsights] ${finalInsight.type}: ${finalInsight.title} [${finalInsight.sentiment}]`);
                } catch (error) {
                    console.error('[LiveInsights] Failed to enrich insight:', error);
                    // Fallback: use original insight (finalInsight already set to insight)
                }
            } else {
                console.log(`[LiveInsights] ${insight.type}: ${insight.title}`);
            }

            // Fix MEDIUM BUG #10: Consolidate duplicate notification calls
            // Previously notifyInsight was called 2-3 times per insight (lines 288, 298, 305)
            // Now it's called exactly once per insight
            this._addInsightWithLimit(finalInsight); // Fix HIGH BUG-H3
            this.emit('insight-detected', finalInsight);
            notificationService.notifyInsight(finalInsight);
        }

        // Check for recurring topics
        this._checkRecurringTopics();
    }

    /**
     * Check if text matches any pattern
     * @private
     */
    _matchesPattern(text, patterns) {
        return patterns.some(pattern => pattern.test(text));
    }

    /**
     * Extract key phrase from text
     * @private
     */
    _extractKeyPhrase(text, maxLength = this.KEY_PHRASE_MAX_LENGTH) {
        // Remove extra whitespace
        const cleaned = text.replace(/\s+/g, ' ').trim();

        // If text is short enough, return it
        if (cleaned.length <= maxLength) {
            return cleaned;
        }

        // Try to cut at sentence boundary
        const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences[0] && sentences[0].length <= maxLength) {
            return sentences[0].trim();
        }

        // Cut at word boundary
        const truncated = cleaned.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        return truncated.substring(0, lastSpace) + '...';
    }

    /**
     * Extract deadline from text
     * @private
     */
    _extractDeadline(text) {
        // Try to find specific date/time patterns
        const timeMatch = text.match(/\b(by|before|until|deadline)\s+([^.!?,]+)/i);
        if (timeMatch) {
            return timeMatch[2].trim();
        }

        const urgentMatch = text.match(/\b(asap|urgent|immediately|right away)\b/i);
        if (urgentMatch) {
            return urgentMatch[1];
        }

        return this._extractKeyPhrase(text, this.TOPIC_NAME_MAX_LENGTH);
    }

    /**
     * Calculate priority based on content
     * @private
     */
    _calculatePriority(text, type) {
        const urgentWords = /\b(urgent|critical|asap|immediately|important|crucial)\b/i;

        if (urgentWords.test(text)) {
            return Priority.HIGH;
        }

        // Type-based defaults
        if (type === InsightType.DEADLINE || type === InsightType.BLOCKER) {
            return Priority.HIGH;
        }

        if (type === InsightType.DECISION || type === InsightType.ACTION) {
            return Priority.MEDIUM;
        }

        return Priority.LOW;
    }

    /**
     * Detect topic changes in conversation
     * @private
     */
    _detectTopicChange(text) {
        const topicChangeIndicators = [
            /\b(let'?s talk about|moving on to|next topic|switching to|regarding)\s+([^.!?,]+)/i,
            /\b(now,|so,|anyway,|by the way,)\s+([^.!?,]+)/i
        ];

        for (const pattern of topicChangeIndicators) {
            const match = text.match(pattern);
            if (match) {
                const topic = match[2] ? match[2].trim() : this._extractKeyPhrase(text, this.TOPIC_NAME_MAX_LENGTH);

                // Track topic frequency
                const count = (this.topicHistory.get(topic) || 0) + 1;
                this.topicHistory.set(topic, count);

                return topic;
            }
        }

        return null;
    }

    /**
     * Check for recurring topics
     * @private
     */
    _checkRecurringTopics() {
        for (const [topic, count] of this.topicHistory.entries()) {
            if (count >= this.RECURRING_TOPIC_THRESHOLD) { // Topic mentioned threshold+ times
                // Fix MEDIUM BUG-M1: Use Map for O(1) lookup instead of O(n) Array.find()
                const existingRecurring = this.recurringTopicsMap.get(topic);

                if (!existingRecurring) {
                    const insight = this._createInsight(
                        InsightType.RECURRING_TOPIC,
                        `Recurring topic: ${topic}`,
                        `This topic has been mentioned ${count} times`,
                        'System',
                        Priority.MEDIUM,
                        { topic, count }
                    );

                    this._addInsightWithLimit(insight); // Fix HIGH BUG-H3
                    this.emit('insight-detected', insight);
                }
            }
        }
    }

    /**
     * Generate proactive AI suggestions based on conversation context
     * @private
     */
    async _generateProactiveSuggestions() {
        try {
            const activeInsights = this.getActiveInsights();
            const suggestions = await contextualAnalysisService.generateProactiveSuggestions(activeInsights);

            if (suggestions && suggestions.length > 0) {
                suggestions.forEach(suggestion => {
                    const insight = this._createInsight(
                        'suggestion', // New type for AI suggestions
                        suggestion.title,
                        suggestion.description,
                        'AI Assistant',
                        suggestion.priority === 'high' ? Priority.HIGH : Priority.MEDIUM,
                        {
                            type: suggestion.type,
                            reasoning: suggestion.reasoning,
                            aiGenerated: true
                        }
                    );

                    this._addInsightWithLimit(insight); // Fix HIGH BUG-H3
                    this.emit('insight-detected', insight);

                    // Notify AI suggestion (Phase 3.3)
                    notificationService.notifySuggestion(suggestion);

                    console.log(`[LiveInsights] AI Suggestion: ${insight.title}`);
                });
            }
        } catch (error) {
            console.error('[LiveInsights] Failed to generate proactive suggestions:', error);
        }
    }

    /**
     * Create insight object
     * @private
     */
    _createInsight(type, title, content, speaker, priority, metadata = {}) {
        return {
            id: this._generateId(),
            session_id: this.sessionId,
            type,
            title,
            content,
            speaker,
            priority,
            timestamp: Date.now(),
            metadata,
            dismissed: false
        };
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all insights for current session
     */
    getAllInsights() {
        return this.insights;
    }

    /**
     * Get insights by type
     */
    getInsightsByType(type) {
        return this.insights.filter(i => i.type === type);
    }

    /**
     * Get insights by priority
     */
    getInsightsByPriority(priority) {
        return this.insights.filter(i => i.priority === priority);
    }

    /**
     * Get active (non-dismissed) insights
     */
    getActiveInsights() {
        return this.insights.filter(i => !i.dismissed);
    }

    /**
     * Dismiss an insight
     * Fix MEDIUM BUG-M1: Use Map for O(1) lookup
     */
    dismissInsight(insightId) {
        // Fix MEDIUM BUG-M1: Use Map for O(1) lookup instead of O(n) Array.find()
        const insight = this.insightsById.get(insightId);
        if (insight) {
            insight.dismissed = true;
            this.emit('insight-dismissed', insight);
            return true;
        }
        return false;
    }

    /**
     * Get meeting statistics
     */
    getSessionStatistics() {
        const active = this.getActiveInsights();

        return {
            total: this.insights.length,
            active: active.length,
            byType: {
                decisions: this.getInsightsByType(InsightType.DECISION).length,
                actions: this.getInsightsByType(InsightType.ACTION).length,
                deadlines: this.getInsightsByType(InsightType.DEADLINE).length,
                questions: this.getInsightsByType(InsightType.QUESTION).length,
                keyPoints: this.getInsightsByType(InsightType.KEY_POINT).length,
                blockers: this.getInsightsByType(InsightType.BLOCKER).length,
                topicChanges: this.getInsightsByType(InsightType.TOPIC_CHANGE).length,
                recurring: this.getInsightsByType(InsightType.RECURRING_TOPIC).length
            },
            byPriority: {
                high: this.getInsightsByPriority(Priority.HIGH).length,
                medium: this.getInsightsByPriority(Priority.MEDIUM).length,
                low: this.getInsightsByPriority(Priority.LOW).length
            },
            openQuestions: this.questionTracker.length, // Fix MEDIUM BUG-M6: Use .length for array
            conversationTurns: this.conversationBuffer.length
        };
    }

    /**
     * Get recent insights (last N)
     */
    getRecentInsights(count = 5) {
        const active = this.getActiveInsights();
        return active.slice(-count).reverse();
    }

    /**
     * Get high priority insights that need attention
     */
    getHighPriorityInsights() {
        return this.insights.filter(
            i => i.priority === Priority.HIGH && !i.dismissed
        );
    }

    /**
     * Generate intelligent summary of conversation (Phase 3.4)
     * @returns {Promise<Object>} Summary with themes, mood, and progress
     */
    async generateIntelligentSummary() {
        try {
            const summary = await contextualAnalysisService.generateIntelligentSummary();
            return summary;
        } catch (error) {
            console.error('[LiveInsights] Failed to generate intelligent summary:', error);
            return null;
        }
    }

    /**
     * Get context summary from AI analysis (Phase 3.4)
     * @returns {Object} Context summary
     */
    getContextSummary() {
        return contextualAnalysisService.getContextSummary();
    }
}

// Export singleton instance
const liveInsightsService = new LiveInsightsService();

// Export types and priorities for use in other modules
liveInsightsService.InsightType = InsightType;
liveInsightsService.Priority = Priority;

module.exports = liveInsightsService;
