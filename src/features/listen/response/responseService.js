/**
 * Response Service - Real-time AI Response Suggestions During Meetings
 *
 * Generates intelligent response suggestions when the user finishes speaking,
 * helping them engage effectively in conversations and meetings.
 *
 * Enhanced with context-aware, phase-sensitive, and type-aware suggestions.
 * Now integrated with Knowledge Base (RAG) for intelligent, fact-based responses.
 */

const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');
const tokenTrackingService = require('../../common/services/tokenTrackingService');
const ragService = require('../../common/services/ragService'); // KB integration
const authService = require('../../common/services/authService'); // For user ID
const documentService = require('../../common/services/documentService'); // KB stats
const LRUCache = require('../../common/utils/lruCache'); // Context cache

/**
 * Suggestion Mode - Determines the type of suggestions to generate
 */
const SuggestionMode = {
    ANSWER: 'answer',       // Provide factual answers from KB
    RELAUNCH: 'relaunch',   // Conversation prompts/follow-ups
    HYBRID: 'hybrid'        // Mix of both
};

/**
 * Conversation Phases
 */
const ConversationPhase = {
    OPENING: 'opening',        // 0-5 tours : Introduction
    EXPLORATION: 'exploration', // 5-15 tours : Découverte
    DISCUSSION: 'discussion',   // 15-30 tours : Discussion active
    DECISION: 'decision',       // 30-50 tours : Prise de décision
    CLOSING: 'closing'         // 50+ tours : Conclusion
};

/**
 * Conversation Types
 */
const ConversationType = {
    SALES: 'sales',              // Vente/négociation commerciale
    BRAINSTORMING: 'brainstorming', // Session créative
    DECISION_MAKING: 'decision',    // Prise de décision
    STATUS_UPDATE: 'status',        // Point d'avancement
    PROBLEM_SOLVING: 'problem',     // Résolution de problème
    ONE_ON_ONE: 'one_on_one',      // Discussion bilatérale
    GENERAL: 'general'              // Conversation générale
};

class ResponseService {
    constructor() {
        this.conversationHistory = [];
        this.enabled = true;
        this.maxContextTurns = 10; // Use last 10 conversation turns for context
        this.isProcessing = false; // Prevent concurrent AI requests
        this.sessionId = null; // Track session for token tracking
        this.summaryService = null; // Reference to summary service for context enrichment
        this.onSuggestionsReady = null;
        this.onSuggestionsError = null;

        // KB Integration: Context cache to avoid repeated RAG lookups (1 min TTL)
        this.kbContextCache = new LRUCache({
            max: 50,
            ttl: 60 * 1000  // 1 minute cache
        });

        // KB Integration: Track last topic to detect changes
        this.lastSearchedTopic = null;

        console.log('[ResponseService] Service initialized with KB integration and context awareness');
    }

    /**
     * Set callbacks for response events
     */
    setCallbacks({ onSuggestionsReady, onSuggestionsError }) {
        this.onSuggestionsReady = onSuggestionsReady;
        this.onSuggestionsError = onSuggestionsError;
    }

    /**
     * Set session ID for token tracking
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        console.log(`[ResponseService] Session ID set: ${sessionId}`);
    }

    /**
     * Set reference to summary service for context enrichment
     */
    setSummaryService(summaryService) {
        this.summaryService = summaryService;
        console.log('[ResponseService] Summary service reference set for context enrichment');
    }

    /**
     * Enable or disable real-time suggestions
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`[ResponseService] Real-time suggestions ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Add a conversation turn to the history
     */
    addConversationTurn(speaker, text) {
        // Validate inputs
        if (!text || typeof text !== 'string') {
            console.warn('[ResponseService] Invalid text parameter, skipping');
            return;
        }

        const normalizedSpeaker = speaker.toLowerCase();
        if (!['me', 'them'].includes(normalizedSpeaker)) {
            console.warn(`[ResponseService] Invalid speaker "${speaker}", skipping`);
            return;
        }

        const turn = {
            speaker: normalizedSpeaker,
            text: text.trim(),
            timestamp: Date.now()
        };

        this.conversationHistory.push(turn);
        console.log(`[ResponseService] Added turn: ${speaker} - "${text.substring(0, 50)}..."`);

        // Keep only the most recent turns
        if (this.conversationHistory.length > this.maxContextTurns) {
            this.conversationHistory.shift();
        }
    }

    /**
     * Get conversation history
     */
    getConversationHistory() {
        return this.conversationHistory;
    }

    /**
     * Reset conversation history
     */
    resetConversationHistory() {
        this.conversationHistory = [];
        this.isProcessing = false; // Reset processing flag on session reset
        console.log('[ResponseService] Conversation history reset');
    }

    /**
     * Format conversation history for prompt
     */
    formatConversationContext() {
        if (this.conversationHistory.length === 0) {
            return 'No conversation history yet.';
        }

        return this.conversationHistory
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');
    }

    /**
     * Detect the current phase of the conversation
     * @private
     * @returns {string} Current conversation phase
     */
    _detectConversationPhase() {
        const turnCount = this.conversationHistory.length;

        if (turnCount < 5) return ConversationPhase.OPENING;
        if (turnCount < 15) return ConversationPhase.EXPLORATION;
        if (turnCount < 30) return ConversationPhase.DISCUSSION;
        if (turnCount < 50) return ConversationPhase.DECISION;
        return ConversationPhase.CLOSING;
    }

    /**
     * Detect the type of conversation based on keywords and patterns
     * @private
     * @returns {string} Detected conversation type
     */
    _detectConversationType() {
        // Analyze keywords in the conversation
        const allText = this.conversationHistory
            .map(turn => turn.text.toLowerCase())
            .join(' ');

        // Pattern detection
        if (/\b(prix|budget|contrat|offre|deal|vente|acheter|vendre|proposition commerciale)\b/.test(allText)) {
            return ConversationType.SALES;
        }
        if (/\b(idée|brainstorm|créatif|innovation|imaginons|si on|pourquoi pas)\b/.test(allText)) {
            return ConversationType.BRAINSTORMING;
        }
        if (/\b(décision|décider|choisir|option|alternative|trancher)\b/.test(allText)) {
            return ConversationType.DECISION_MAKING;
        }
        if (/\b(problème|bug|issue|blocker|bloqué|erreur|dysfonctionnement)\b/.test(allText)) {
            return ConversationType.PROBLEM_SOLVING;
        }
        if (/\b(statut|avancement|progrès|update|point|où en est)\b/.test(allText)) {
            return ConversationType.STATUS_UPDATE;
        }

        // Detect one-on-one (only 2 speakers, 10+ turns)
        const speakers = new Set(this.conversationHistory.map(t => t.speaker));
        if (speakers.size === 2 && this.conversationHistory.length > 10) {
            return ConversationType.ONE_ON_ONE;
        }

        return ConversationType.GENERAL;
    }

    /**
     * Analyze the last message to detect if it was a question or request
     * @private
     * @returns {Object} { isQuestion, isRequest, questionType, subject, factualAnalysis }
     */
    _analyzeLastMessage() {
        // Get the last message from ANY speaker (analyze both 'me' and 'them')
        // This allows detecting factual questions from the user too
        if (this.conversationHistory.length === 0) {
            return { isQuestion: false, isRequest: false, questionType: null, subject: null, factualAnalysis: null };
        }
        
        // Use the most recent message regardless of speaker
        const lastMessages = [this.conversationHistory[this.conversationHistory.length - 1]];

        const lastMessage = lastMessages[lastMessages.length - 1];
        const text = lastMessage.text.toLowerCase();
        
        console.log(`[ResponseService] 🔍 _analyzeMessage called with text: "${lastMessage.text}"`);

        // Detection result object
        const result = {
            isQuestion: false,
            isRequest: false,
            questionType: null,
            subject: null,
            factualAnalysis: null // NEW: factual question analysis
        };

        // 1. Direct question detection (ends with ?)
        if (/\?$/.test(lastMessage.text.trim())) {
            result.isQuestion = true;
        }

        // 2. Question word detection (French + English)
        const questionWords = {
            // What questions
            what: /\b(qu'est-ce que|qu'est ce que|quel|quelle|quels|quelles|what|which)\b/i,
            // How questions
            how: /\b(comment|de quelle manière|how)\b/i,
            // When questions
            when: /\b(quand|à quel moment|when)\b/i,
            // Why questions
            why: /\b(pourquoi|pour quelle raison|why)\b/i,
            // Where questions
            where: /\b(où|where)\b/i,
            // Who questions
            who: /\b(qui|who)\b/i,
            // Yes/No questions (auxiliary verb at start)
            yesno: /^(est-ce que|peux-tu|pouvez-vous|as-tu|avez-vous|veux-tu|voulez-vous|can you|could you|would you|do you|does|did|is|are|was|were|have|has|had)\b/i
        };

        for (const [type, pattern] of Object.entries(questionWords)) {
            if (pattern.test(text)) {
                result.isQuestion = true;
                result.questionType = type;
                break;
            }
        }

        // 3. Request detection (French + English)
        const requestPatterns = [
            // French polite requests
            /\b(pouvez-vous|pourriez-vous|peux-tu|pourrais-tu|veuillez|merci de|s'il vous plaît|svp)\b/i,
            // French direct requests
            /\b(il faut que|il faudrait que|je voudrais que|j'aimerais que|j'ai besoin|donne-moi|dis-moi)\b/i,
            // English polite requests
            /\b(could you|can you|would you|will you|please|kindly)\b/i,
            // English direct requests
            /\b(i need|i want|i would like|give me|tell me|show me|send me)\b/i,
            // Command form
            /^(fais|fait|envoie|envoyez|donne|donnez|explique|expliquez|do|make|send|give|explain|show)\b/i
        ];

        for (const pattern of requestPatterns) {
            if (pattern.test(text)) {
                result.isRequest = true;
                break;
            }
        }

        // 4. Extract question/request subject
        if (result.isQuestion || result.isRequest) {
            result.subject = this._extractQuestionSubject(lastMessage.text);
        }

        // 5. NEW: Detect if this is a factual question requiring encyclopedic answers
        // Always check for factual patterns, even if not a traditional question
        console.log(`[ResponseService] 🔍 About to call _detectFactualQuestion with: "${lastMessage.text}"`);
        result.factualAnalysis = this._detectFactualQuestion(lastMessage.text);
        console.log(`[ResponseService] 🔍 _detectFactualQuestion result:`, JSON.stringify(result.factualAnalysis));
        
        if (result.factualAnalysis.isFactual) {
            console.log(`[ResponseService] 📚 FACTUAL QUESTION DETECTED: type=${result.factualAnalysis.factualType}, multiAngle=${result.factualAnalysis.requiresMultiAngle}`);
            // Override isQuestion if factual pattern detected
            result.isQuestion = true;
        } else {
            console.log(`[ResponseService] ❌ NOT a factual question, isQuestion=${result.isQuestion}`);
        }

        return result;
    }

    /**
     * Extract the subject/topic of a question or request
     * @private
     * @param {string} text - The question or request text
     * @returns {string} The extracted subject or the full text
     */
    _extractQuestionSubject(text) {
        // Remove question marks and common question words
        let subject = text
            .replace(/\?/g, '')
            .replace(/\b(qu'est-ce que|qu'est ce que|comment|quand|où|pourquoi|qui|quel|quelle|what|how|when|where|why|who|which)\b/gi, '')
            .replace(/\b(pouvez-vous|pourriez-vous|peux-tu|pourrais-tu|could you|can you|would you|will you|please)\b/gi, '')
            .replace(/\b(est-ce que)\b/gi, '')
            .trim();

        // Remove leading articles
        subject = subject.replace(/^(le|la|les|un|une|des|the|a|an)\b\s*/i, '');

        // If subject is too short or empty, return first 50 chars of original
        if (subject.length < 5) {
            return text.substring(0, 50);
        }

        // Return first 50 chars of cleaned subject
        return subject.substring(0, 50);
    }

    /**
     * Detect if a question requires factual/encyclopedic answers
     * These questions need precise, verifiable facts rather than conversation suggestions
     * @private
     * @param {string} text - The question text
     * @returns {Object} { isFactual, factualType, requiresMultiAngle }
     */
    _detectFactualQuestion(text) {
        const lowerText = text.toLowerCase();

        const result = {
            isFactual: false,
            factualType: null,
            requiresMultiAngle: false
        };

        // Situation/Current Events questions - require multi-angle (what's happening, situation)
        const situationPatterns = [
            /\b(ce\s+qu[i'].*se\s+passe|what('s|\s+is)\s+happening|ce\s+qui\s+arrive|what\s+happens)\b/i,
            /\b(situation|état|state|condition|status)\b/i,
            /\b(actualité|actualités|news|dernières\s+nouvelles|latest)\b/i,
            /\b(problème|problem|crise|crisis|conflit|conflict)\b/i,
            /\b(savoir|know|comprendre|understand|expliquer|explain)\s*.{0,30}\s*(se\s+passe|happening|situation)\b/i
        ];

        // Geographic/Capital questions - require multi-angle (political, cultural, economic, crisis)
        const geographicPatterns = [
            /\b(capitale|capital|chef-lieu)\b/i,
            /\b(pays|country|nation|état|state)\b.*\b(est|is|se trouve|located)\b/i,
            /\b(population|habitants|superficie|area|size)\b/i,
            /\b(frontière|border|voisin|neighbor)\b/i,
            /\b(continent|région|region)\b/i
        ];

        // Definition/Identity questions
        const definitionPatterns = [
            /\b(qu'est-ce que?|what is|c'est quoi|définition|definition|signifie|means)\b/i,
            /\b(qui est|who is|qui était|who was)\b/i,
            /\b(quel(le)? est|what is the)\b/i
        ];

        // Historical/Factual questions
        const historicalPatterns = [
            /\b(quand|when|en quelle année|what year|depuis quand|since when)\b/i,
            /\b(fondé|founded|créé|created|établi|established)\b/i,
            /\b(histoire|history|origine|origin)\b/i
        ];

        // Numeric/Statistical questions
        const numericPatterns = [
            /\b(combien|how many|how much|quel nombre|what number)\b/i,
            /\b(pourcentage|percentage|taux|rate|statistique|statistic)\b/i,
            /\b(pib|gdp|économie|economy|monnaie|currency)\b/i
        ];

        // Political/Governmental questions
        const politicalPatterns = [
            /\b(président|president|premier ministre|prime minister|gouvernement|government)\b/i,
            /\b(régime|regime|système politique|political system|constitution)\b/i,
            /\b(parti|party|élection|election|vote)\b/i
        ];

        // Check situation patterns FIRST (most specific - require multi-angle responses)
        for (const pattern of situationPatterns) {
            if (pattern.test(lowerText)) {
                result.isFactual = true;
                result.factualType = 'situation';
                result.requiresMultiAngle = true;
                return result;
            }
        }

        // Check geographic patterns (require multi-angle responses)
        for (const pattern of geographicPatterns) {
            if (pattern.test(lowerText)) {
                result.isFactual = true;
                result.factualType = 'geographic';
                result.requiresMultiAngle = true;
                return result;
            }
        }

        // Check political patterns (require multi-angle responses)
        for (const pattern of politicalPatterns) {
            if (pattern.test(lowerText)) {
                result.isFactual = true;
                result.factualType = 'political';
                result.requiresMultiAngle = true;
                return result;
            }
        }

        // Check definition patterns
        for (const pattern of definitionPatterns) {
            if (pattern.test(lowerText)) {
                result.isFactual = true;
                result.factualType = 'definition';
                result.requiresMultiAngle = true;
                return result;
            }
        }

        // Check historical patterns
        for (const pattern of historicalPatterns) {
            if (pattern.test(lowerText)) {
                result.isFactual = true;
                result.factualType = 'historical';
                result.requiresMultiAngle = false;
                return result;
            }
        }

        // Check numeric patterns
        for (const pattern of numericPatterns) {
            if (pattern.test(lowerText)) {
                result.isFactual = true;
                result.factualType = 'numeric';
                result.requiresMultiAngle = false;
                return result;
            }
        }

        return result;
    }

    /**
     * Build enriched context including meeting summary, phase, and type
     * @private
     * @returns {Object} Enriched context object
     */
    _buildEnrichedContext() {
        const context = {
            // Recent conversation turns
            recentTurns: this.conversationHistory.slice(-10),

            // Detected phase and type
            conversationPhase: this._detectConversationPhase(),
            conversationType: this._detectConversationType(),

            // Question/request analysis
            messageAnalysis: this._analyzeLastMessage(),

            // Meeting context from summary service
            meetingContext: null
        };

        // Retrieve analysis from summary service if available
        if (this.summaryService) {
            const analysis = this.summaryService.getCurrentAnalysisData();
            if (analysis && analysis.previousResult) {
                const result = analysis.previousResult;
                context.meetingContext = {
                    mainTopic: result.topic?.header || 'Unknown',
                    keyPoints: (result.summary || []).slice(0, 3),
                    decisions: (result.decisions || []).slice(0, 3).map(d => d.title || d.description || d),
                    actions: (result.actionItems || []).slice(0, 3).map(a => a.task || a),
                    unresolvedItems: (result.unresolvedItems || []).slice(0, 3)
                };
            }
        }

        return context;
    }

    /**
     * Get instructions specific to conversation type
     * @private
     */
    _getInstructionsForType(type) {
        const instructions = {
            sales: 'Concentre-toi sur la création de valeur, la gestion des objections et la conclusion. Sois consultatif.',
            brainstorming: 'Encourage la pensée créative, construis sur les idées, pose des questions "et si" expansives.',
            decision: 'Clarifie les options, pèse le pour et le contre, guide vers une décision concrète avec un raisonnement clair.',
            problem: 'Identifie les causes profondes, propose des solutions et vérifie la compréhension. Sois analytique.',
            status: 'Reconnais les progrès, identifie les blocages et définis les prochaines étapes claires.',
            one_on_one: 'Sois empathique, pose des questions ouvertes, construis un rapport de confiance.',
            general: 'Sois utile, engagé et fais avancer la conversation naturellement.'
        };
        return instructions[type] || instructions.general;
    }

    /**
     * Get instructions specific to conversation phase
     * @private
     */
    _getInstructionsForPhase(phase) {
        const instructions = {
            opening: 'Pose des questions de clarification pour comprendre le contexte, les objectifs et les attentes.',
            exploration: 'Creuse plus profondément avec des questions ciblées et partage des perspectives pertinentes.',
            discussion: 'Engage-toi activement avec des arguments réfléchis, des contre-points ou construis de manière constructive sur les idées.',
            decision: 'Résume clairement les options et recommande un chemin concret à suivre.',
            closing: 'Récapitule les points clés, confirme les prochaines étapes et assure un alignement clair.'
        };
        return instructions[phase] || '';
    }

    /**
     * Get the goal for each phase
     * @private
     */
    _getPhaseGoal(phase) {
        const goals = {
            opening: 'établir le contexte et les objectifs',
            exploration: 'recueillir des informations et des perspectives',
            discussion: 'un engagement actif et une collaboration',
            decision: 'atteindre une décision ou un consensus',
            closing: 'définir les actions et les prochaines étapes'
        };
        return goals[phase] || 'un résultat productif';
    }

    /**
     * Detect the appropriate suggestion mode based on conversation context
     * @private
     * @param {Object} messageAnalysis - Analysis of the last message
     * @param {string} conversationType - Type of conversation
     * @returns {string} Suggestion mode (ANSWER, RELAUNCH, or HYBRID)
     */
    _detectSuggestionMode(messageAnalysis, conversationType) {
        // If a direct question was asked, prioritize answers
        if (messageAnalysis.isQuestion) {
            // Factual questions need KB answers
            if (messageAnalysis.questionType === 'what' ||
                messageAnalysis.questionType === 'how' ||
                messageAnalysis.questionType === 'why') {
                return SuggestionMode.ANSWER;
            }
            // Yes/No and other questions can be hybrid
            return SuggestionMode.HYBRID;
        }

        // Problem-solving conversations need answers from KB
        if (conversationType === ConversationType.PROBLEM_SOLVING) {
            return SuggestionMode.ANSWER;
        }

        // Sales and decision-making benefit from KB insights
        if (conversationType === ConversationType.SALES ||
            conversationType === ConversationType.DECISION_MAKING) {
            return SuggestionMode.HYBRID;
        }

        // Brainstorming and status updates are more about relaunches
        if (conversationType === ConversationType.BRAINSTORMING ||
            conversationType === ConversationType.STATUS_UPDATE) {
            return SuggestionMode.RELAUNCH;
        }

        // Default to hybrid for balanced suggestions
        return SuggestionMode.HYBRID;
    }

    /**
     * Extract the main topic from conversation for KB search
     * @private
     * @returns {string} Main topic for search
     */
    _extractMainTopic() {
        const allText = this.conversationHistory
            .slice(-5) // Focus on recent turns
            .map(turn => turn.text)
            .join(' ');

        // Get meeting context topic if available
        if (this.summaryService) {
            const analysis = this.summaryService.getCurrentAnalysisData();
            if (analysis?.previousResult?.topic?.header) {
                return analysis.previousResult.topic.header;
            }
        }

        // Extract key nouns and technical terms (simple heuristic)
        // Remove common words and keep substantive terms
        const commonWords = /\b(le|la|les|un|une|des|de|du|et|ou|en|à|pour|avec|sur|dans|que|qui|quoi|est|sont|a|ont|fait|faire|être|avoir|ce|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|je|tu|il|elle|nous|vous|ils|elles|on|the|a|an|and|or|in|to|for|with|on|that|which|is|are|has|have|do|does|this|these|my|your|his|her|our|their|i|you|he|she|we|they|it)\b/gi;

        const cleanedText = allText
            .replace(commonWords, '')
            .replace(/[?!.,;:]/g, '')
            .trim();

        // Return first 100 chars as search topic
        return cleanedText.substring(0, 100) || allText.substring(0, 100);
    }

    /**
     * Retrieve relevant context from Knowledge Base
     * @private
     * @param {string} topic - Topic to search for
     * @returns {Promise<Object>} KB context with sources
     */
    async _retrieveKBContext(topic) {
        // Check cache first
        const cacheKey = topic.substring(0, 50).toLowerCase();
        if (this.kbContextCache.has(cacheKey)) {
            console.log('[ResponseService] KB context cache hit');
            return this.kbContextCache.get(cacheKey);
        }

        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                console.log('[ResponseService] No user ID, skipping KB lookup');
                return { hasContext: false, sources: [] };
            }

            // Check if user has indexed documents
            const stats = await documentService.getDocumentStats(userId);
            if (!stats || stats.indexed_documents === 0) {
                console.log('[ResponseService] No indexed documents for KB lookup');
                return { hasContext: false, sources: [] };
            }

            console.log(`[ResponseService] Searching KB for: "${topic.substring(0, 50)}..."`);

            // Retrieve relevant context
            const ragContext = await ragService.retrieveContext(topic, {
                maxChunks: 5,  // Keep it small for real-time performance
                minScore: 0.3 // Lowered to 0.3 for better recall
            });

            if (ragContext && ragContext.hasContext) {
                console.log(`[ResponseService] KB: Found ${ragContext.sources.length} relevant chunks`);

                // Format KB context for prompt injection
                const formattedContext = {
                    hasContext: true,
                    sources: ragContext.sources.slice(0, 3), // Top 3 most relevant
                    formattedText: ragContext.sources.slice(0, 3).map((s, i) =>
                        `[Source ${i + 1}: ${s.document_title}]\n${s.content.substring(0, 300)}...`
                    ).join('\n\n'),
                    totalTokens: ragContext.totalTokens
                };

                // Cache the result
                this.kbContextCache.set(cacheKey, formattedContext);
                this.lastSearchedTopic = topic;

                return formattedContext;
            }

            console.log('[ResponseService] KB: No relevant context found');
            return { hasContext: false, sources: [] };

        } catch (error) {
            console.warn('[ResponseService] KB lookup failed:', error.message);
            return { hasContext: false, sources: [], error: error.message };
        }
    }

    /**
     * Build intelligent, context-aware prompt with KB integration
     * @private
     * @param {Object} enrichedContext - Context from _buildEnrichedContext
     * @param {Object} kbContext - Knowledge base context from _retrieveKBContext
     * @param {string} suggestionMode - Mode from _detectSuggestionMode
     */
    _buildSmartPrompt(enrichedContext, kbContext = null, suggestionMode = SuggestionMode.HYBRID) {
        const {
            recentTurns,
            meetingContext,
            conversationPhase,
            conversationType,
            messageAnalysis
        } = enrichedContext;

        // Type-specific instructions
        const typeInstructions = this._getInstructionsForType(conversationType);

        // Phase-specific instructions
        const phaseInstructions = this._getInstructionsForPhase(conversationPhase);

        // Question/Request-specific instructions
        let questionRequestPrompt = '';
        if (messageAnalysis.isQuestion) {
            const questionTypeInfo = messageAnalysis.questionType ? ` (${messageAnalysis.questionType} question)` : '';
            questionRequestPrompt = `\n\n🎯 **IMPORTANT: A question was just asked${questionTypeInfo}**
Subject: "${messageAnalysis.subject}"

Your suggestions MUST provide DIRECT ANSWERS to this question. Do NOT generate generic responses or deflections.`;
        } else if (messageAnalysis.isRequest) {
            questionRequestPrompt = `\n\n🎯 **IMPORTANT: A request was just made**
Request: "${messageAnalysis.subject}"

Your suggestions MUST acknowledge and respond to this request. Provide actionable responses.`;
        }

        // Build meeting context section
        let meetingContextPrompt = '';
        if (meetingContext && meetingContext.mainTopic !== 'Unknown') {
            const parts = [];

            if (meetingContext.mainTopic) {
                parts.push(`Main Topic: ${meetingContext.mainTopic}`);
            }
            if (meetingContext.keyPoints && meetingContext.keyPoints.length > 0) {
                parts.push(`Key Points: ${meetingContext.keyPoints.join(', ')}`);
            }
            if (meetingContext.decisions && meetingContext.decisions.length > 0) {
                parts.push(`Decisions Made: ${meetingContext.decisions.join(', ')}`);
            }
            if (meetingContext.actions && meetingContext.actions.length > 0) {
                parts.push(`Pending Actions: ${meetingContext.actions.join(', ')}`);
            }
            if (meetingContext.unresolvedItems && meetingContext.unresolvedItems.length > 0) {
                parts.push(`Unresolved: ${meetingContext.unresolvedItems.join(', ')}`);
            }

            if (parts.length > 0) {
                meetingContextPrompt = `\n\n🎯 **Meeting Context:**\n- ${parts.join('\n- ')}\n\n**Your responses should align with this context and move the conversation forward.**`;
            }
        }

        // NEW: Build Knowledge Base context section
        let kbContextPrompt = '';
        if (kbContext && kbContext.hasContext && kbContext.formattedText) {
            kbContextPrompt = `\n\n📚 **BASE DE CONNAISSANCES - Informations Pertinentes:**
${kbContext.formattedText}

⚠️ **INSTRUCTION CRITIQUE:** Utilise ces informations de la base de connaissances pour formuler des réponses FACTUELLES et PRÉCISES. Cite les sources quand pertinent.`;
        }

        // NEW: Mode-specific instructions
        let modeInstructions = '';
        switch (suggestionMode) {
            case SuggestionMode.ANSWER:
                modeInstructions = `
**MODE RÉPONSE ACTIVÉ:** Génère des réponses FACTUELLES et INFORMATIVES basées sur:
- La base de connaissances ci-dessus (si disponible)
- Ton expertise sur le sujet
- Des faits concrets et vérifiables
NE génère PAS de questions de relance. L'utilisateur a besoin de RÉPONSES.`;
                break;
            case SuggestionMode.RELAUNCH:
                modeInstructions = `
**MODE RELANCE:** Génère des questions et propositions pour:
- Approfondir la discussion
- Explorer de nouveaux angles
- Faire avancer la conversation`;
                break;
            case SuggestionMode.HYBRID:
            default:
                modeInstructions = `
**MODE HYBRIDE:** Génère un MIX de:
1. Une RÉPONSE factuelle basée sur tes connaissances${kbContext?.hasContext ? ' et la base de données' : ''}
2. Une PROPOSITION concrète ou action
3. Une QUESTION pertinente pour approfondir`;
                break;
        }

        // Format recent conversation
        const recentConversation = recentTurns
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        return `Tu es un assistant de réunion intelligent qui aide l'utilisateur à répondre dans une conversation de type ${conversationType}.

${typeInstructions}

**Phase actuelle:** ${conversationPhase}
${phaseInstructions}
${meetingContextPrompt}
${kbContextPrompt}
${questionRequestPrompt}
${modeInstructions}

**Conversation récente:**
${recentConversation}

**Tâche:** Génère 3 suggestions de réponse INTELLIGENTES et UTILES pour l'utilisateur.

**Exigences:**
1. Chaque suggestion doit être SPÉCIFIQUE au contexte et apporter de la VALEUR
2. ${suggestionMode === SuggestionMode.ANSWER ? 'Privilégie les RÉPONSES FACTUELLES aux questions de relance' : 'Varie les approches selon le mode indiqué'}
3. Garde chaque suggestion sous 30 mots mais INFORMATIVE
4. Si la base de connaissances contient des infos pertinentes, UTILISE-LES
5. Fais avancer la conversation vers ${this._getPhaseGoal(conversationPhase)}
6. N'utilise JAMAIS de phrases génériques comme "c'est intéressant", "dis-m'en plus", "je vois"
7. RÉPONDS TOUJOURS EN FRANÇAIS

**Format:**
1. [Première suggestion - ${suggestionMode === SuggestionMode.ANSWER ? 'Réponse factuelle' : 'Proposition'}]
2. [Deuxième suggestion - ${suggestionMode === SuggestionMode.ANSWER ? 'Information clé' : 'Action concrète'}]
3. [Troisième suggestion - ${suggestionMode === SuggestionMode.RELAUNCH ? 'Question de relance' : 'Insight basé sur KB ou expertise'}]

Génère UNIQUEMENT les suggestions numérotées. Pas d'explications ni de commentaires.`;
    }

    /**
     * Build specialized prompt for factual/encyclopedic questions
     * Generates multi-angle responses: Political, Cultural, Economic, Crisis/Issues
     * @private
     * @param {Object} enrichedContext - Context from _buildEnrichedContext
     * @param {Object} factualAnalysis - Factual question analysis from _detectFactualQuestion
     */
    _buildFactualMultiAnglePrompt(enrichedContext, factualAnalysis) {
        const { recentTurns, messageAnalysis } = enrichedContext;
        const questionText = messageAnalysis.subject || recentTurns[recentTurns.length - 1]?.text || '';

        // Get the last question from "them"
        const lastThemMessages = recentTurns.filter(t => t.speaker === 'them');
        const fullQuestion = lastThemMessages.length > 0
            ? lastThemMessages[lastThemMessages.length - 1].text
            : questionText;

        // Format recent conversation for context
        const recentConversation = recentTurns
            .slice(-5)
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        return `Tu es un expert encyclopédique avec des connaissances approfondies. Tu dois RÉPONDRE FACTUELLEMENT à la question posée.

**QUESTION POSÉE:** "${fullQuestion}"

**CONTEXTE DE LA CONVERSATION:**
${recentConversation}

**TYPE DE QUESTION:** ${factualAnalysis.factualType} (${factualAnalysis.requiresMultiAngle ? 'nécessite plusieurs angles' : 'réponse directe'})

**INSTRUCTION CRITIQUE:**
Tu dois générer 3 RÉPONSES FACTUELLES sous 3 ANGLES DIFFÉRENTS.
Chaque réponse doit contenir des FAITS VÉRIFIABLES (dates, chiffres, noms propres).

**ANGLES OBLIGATOIRES POUR CETTE RÉPONSE:**
🏛️ **POLITIQUE/GOUVERNANCE**: Aspect administratif, gouvernemental, institutionnel, géopolitique
🌍 **CULTUREL/HISTORIQUE**: Aspect culturel, historique, social, démographique, traditions
💵 **ÉCONOMIQUE/CRISES**: Aspect économique ET problèmes/crises/enjeux actuels du sujet

**RÈGLES STRICTES:**
- Chaque réponse: 25-40 mots EXACTEMENT
- COMMENCE chaque réponse par l'emoji de l'angle correspondant
- INCLUS des FAITS VÉRIFIABLES: dates, chiffres, noms, statistiques
- NE génère PAS de questions ni de "vous devriez"
- NE génère PAS de réponses vagues comme "c'est intéressant"
- RÉPONDS DIRECTEMENT à la question avec des FAITS
- RÉPONDS EN FRANÇAIS

**EXEMPLES DE BONNES RÉPONSES (pour "Quelle est la capitale de la Centrafrique?"):**
1. 🏛️ Bangui est la capitale et siège du gouvernement centrafricain depuis l'indépendance en 1960. La ville abrite l'Assemblée nationale et les institutions de la République.
2. 🌍 Bangui, fondée en 1889 par les Français sur l'Oubangui, compte environ 900 000 habitants. Son nom signifie "les rapides" en langue Sango, langue nationale.
3. 💵 Bangui concentre 80% de l'activité économique nationale mais subit les conséquences du conflit armé depuis 2013, avec 1,5 million de déplacés selon l'ONU.

**FORMAT DE SORTIE:**
1. 🏛️ [Réponse politique/gouvernance - 25-40 mots avec faits]
2. 🌍 [Réponse culturelle/historique - 25-40 mots avec faits]
3. 💵 [Réponse économique/crises - 25-40 mots avec faits]

Génère UNIQUEMENT les 3 réponses numérotées. Pas d'introduction ni de conclusion.`;
    }

    /**
     * Rank suggestions by quality, filtering generic ones
     * @private
     */
    _rankSuggestions(suggestions) {
        const rankedSuggestions = suggestions.map(suggestion => {
            let score = 100;

            // Heavily penalize generic phrases (French + English)
            const genericPhrases = [
                // French
                'c\'est intéressant',
                'dis-m\'en plus',
                'je vois',
                'bon point',
                'ça a du sens',
                'je comprends',
                'd\'accord',
                'ok',
                'très bien',
                'compris',
                'effectivement',
                'absolument',
                // English
                'that\'s interesting',
                'tell me more',
                'i see',
                'good point',
                'makes sense',
                'i understand',
                'okay',
                'alright',
                'sounds good',
                'got it'
            ];

            for (const phrase of genericPhrases) {
                if (suggestion.toLowerCase().includes(phrase)) {
                    score -= 40;
                }
            }

            // Reward specific questions
            if (/\b(qui|quoi|quand|où|pourquoi|comment|who|what|when|where|why|how)\b/i.test(suggestion)) {
                score += 15;
            }

            // Reward numbers and specific details
            if (/\b\d+\b/.test(suggestion)) {
                score += 15;
            }

            // Reward concrete action words
            if (/\b(va|vais|pouvons|proposer|suggère|recommande|will|can|should|let's|propose|suggest)\b/i.test(suggestion)) {
                score += 12;
            }

            // Reward longer, more detailed responses
            const wordCount = suggestion.split(/\s+/).length;
            if (wordCount > 8) {
                score += 10;
            }

            // Penalize very short responses (likely generic)
            if (wordCount < 4) {
                score -= 25;
            }

            return { suggestion, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(item => item.suggestion);

        return rankedSuggestions;
    }

    /**
     * Generate response suggestions based on conversation history
     * Triggered when user ("Me") finishes speaking
     */
    async generateSuggestions() {
        if (!this.enabled) {
            console.log('[ResponseService] Suggestions disabled, skipping');
            return null;
        }

        if (this.isProcessing) {
            console.log('[ResponseService] Already processing suggestions, skipping duplicate request');
            return null;
        }

        if (this.conversationHistory.length === 0) {
            console.log('[ResponseService] No conversation history, skipping');
            return null;
        }

        console.log(`[ResponseService] Generating suggestions based on ${this.conversationHistory.length} turns`);

        this.isProcessing = true;

        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key is not configured.');
            }

            // Build enriched context with phase, type, and meeting summary
            const enrichedContext = this._buildEnrichedContext();
            console.log(`[ResponseService] Context: ${enrichedContext.conversationType} conversation, ${enrichedContext.conversationPhase} phase`);

            // NEW: Detect suggestion mode (ANSWER vs RELAUNCH vs HYBRID)
            const suggestionMode = this._detectSuggestionMode(
                enrichedContext.messageAnalysis,
                enrichedContext.conversationType
            );
            console.log(`[ResponseService] Suggestion mode: ${suggestionMode}`);

            // NEW: Check if this is a factual question requiring multi-angle encyclopedic response
            const factualAnalysis = enrichedContext.messageAnalysis.factualAnalysis;
            const isFactualQuestion = factualAnalysis?.isFactual && factualAnalysis?.requiresMultiAngle;

            if (isFactualQuestion) {
                console.log(`[ResponseService] 📚 FACTUAL QUESTION DETECTED: type=${factualAnalysis.factualType}`);
            }

            // NEW: Extract main topic and retrieve KB context (skip for factual questions - use LLM knowledge)
            let kbContext = { hasContext: false, sources: [] };
            if (suggestionMode !== SuggestionMode.RELAUNCH && !isFactualQuestion) {
                try {
                    const mainTopic = this._extractMainTopic();
                    console.log(`[ResponseService] Searching KB for topic: "${mainTopic.substring(0, 50)}..."`);
                    kbContext = await this._retrieveKBContext(mainTopic);

                    if (kbContext.hasContext) {
                        console.log(`[ResponseService] 📚 KB context found: ${kbContext.sources.length} sources`);
                    }
                } catch (kbError) {
                    console.warn('[ResponseService] KB retrieval failed, continuing without KB context:', kbError.message);
                }
            }

            // Build the appropriate prompt based on question type
            let smartPrompt;
            if (isFactualQuestion) {
                // Use specialized factual multi-angle prompt for encyclopedic questions
                smartPrompt = this._buildFactualMultiAnglePrompt(enrichedContext, factualAnalysis);
                console.log('[ResponseService] Using FACTUAL MULTI-ANGLE prompt');
            } else {
                // Use standard context-aware prompt for conversation suggestions
                smartPrompt = this._buildSmartPrompt(enrichedContext, kbContext, suggestionMode);
            }

            const messages = [
                {
                    role: 'system',
                    content: getSystemPrompt('meeting_assistant', '', false)
                },
                {
                    role: 'user',
                    content: smartPrompt
                }
            ];

            console.log('[ResponseService] Sending context-enriched request to AI...');

            // Determine temperature based on question type and suggestion mode
            // Lowest temperature (0.2) for factual encyclopedic questions - we need precision
            // Low temperature (0.3) for regular answers - facts with some flexibility
            // Medium temperature (0.5) for creative suggestions
            const temperature = isFactualQuestion ? 0.2 :
                               (suggestionMode === SuggestionMode.ANSWER ? 0.3 : 0.5);

            // Increase tokens for factual questions to allow for detailed multi-angle responses
            const maxTokens = isFactualQuestion ? 600 : 400;

            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: temperature, // 0.2 for facts, 0.3 for answers, 0.5 for suggestions
                maxTokens: maxTokens, // 600 for factual, 400 for regular
                timeout: 30000, // 30 second timeout to prevent hanging
                usePortkey: modelInfo.provider === 'openai-lucide',
                portkeyVirtualKey: modelInfo.provider === 'openai-lucide' ? modelInfo.apiKey : undefined,
            });

            const completion = await llm.chat(messages);
            const responseText = completion.content;

            // Track token usage and cost
            tokenTrackingService.trackUsage({
                provider: modelInfo.provider,
                model: modelInfo.model,
                response: completion,
                sessionId: this.sessionId, // Now properly tracked with session ID
                feature: 'response'
            });

            console.log('[ResponseService] Suggestions received');

            // Parse the suggestions
            let suggestions = this.parseSuggestions(responseText);

            if (suggestions && suggestions.length > 0) {
                console.log(`[ResponseService] Parsed ${suggestions.length} suggestions`);

                // Rank suggestions by quality (filter out generic ones)
                suggestions = this._rankSuggestions(suggestions);
                console.log(`[ResponseService] Ranked suggestions by quality`);

                // Notify callback
                if (this.onSuggestionsReady) {
                    this.onSuggestionsReady(suggestions);
                }

                return suggestions;
            } else {
                console.warn('[ResponseService] No valid suggestions parsed');
                return null;
            }
        } catch (error) {
            console.error('[ResponseService] Error generating suggestions:', error.message);

            if (this.onSuggestionsError) {
                this.onSuggestionsError(error);
            }

            return null;
        } finally {
            // Always release the processing lock
            this.isProcessing = false;
        }
    }

    /**
     * Parse AI response to extract suggestions
     */
    parseSuggestions(responseText) {
        const suggestions = [];

        try {
            const lines = responseText.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();

                // Match numbered suggestions like "1. [suggestion]" or "1) [suggestion]"
                const match = trimmedLine.match(/^\d+[\.)]\s*(.+)$/);

                if (match && suggestions.length < 3) {
                    const suggestion = match[1].trim();

                    // Remove markdown formatting if present
                    const cleanSuggestion = suggestion
                        .replace(/^\[/, '')
                        .replace(/\]$/, '')
                        .replace(/\*\*/g, '')
                        .trim();

                    if (cleanSuggestion.length > 0) {
                        suggestions.push(cleanSuggestion);
                    }
                }
            }

            // If no numbered suggestions found, try to extract any bullet points
            if (suggestions.length === 0) {
                for (const line of lines) {
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                        const suggestion = trimmedLine.substring(1).trim();

                        if (suggestion.length > 0 && suggestions.length < 3) {
                            suggestions.push(suggestion);
                        }
                    }
                }
            }

            return suggestions;
        } catch (error) {
            console.error('[ResponseService] Error parsing suggestions:', error);
            return [];
        }
    }

    /**
     * Get current service state
     */
    getState() {
        return {
            enabled: this.enabled,
            conversationTurns: this.conversationHistory.length,
            maxContextTurns: this.maxContextTurns
        };
    }
}

// Singleton instance
const responseService = new ResponseService();

module.exports = responseService;
