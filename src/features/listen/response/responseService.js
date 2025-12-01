/**
 * Response Service - Real-time AI Response Suggestions During Meetings
 *
 * Generates intelligent response suggestions when the user finishes speaking,
 * helping them engage effectively in conversations and meetings.
 *
 * Enhanced with context-aware, phase-sensitive, and type-aware suggestions.
 */

const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');
const tokenTrackingService = require('../../common/services/tokenTrackingService');

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

        console.log('[ResponseService] Service initialized with enhanced context awareness');
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
     * @returns {Object} { isQuestion, isRequest, questionType, subject }
     */
    _analyzeLastMessage() {
        // Get the last message from "them" (the other person)
        const lastMessages = this.conversationHistory.filter(t => t.speaker === 'them');
        if (lastMessages.length === 0) {
            return { isQuestion: false, isRequest: false, questionType: null, subject: null };
        }

        const lastMessage = lastMessages[lastMessages.length - 1];
        const text = lastMessage.text.toLowerCase();

        // Detection result object
        const result = {
            isQuestion: false,
            isRequest: false,
            questionType: null,
            subject: null
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
     * Build intelligent, context-aware prompt
     * @private
     */
    _buildSmartPrompt(enrichedContext) {
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

        // Format recent conversation
        const recentConversation = recentTurns
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        return `Tu es un assistant de réunion intelligent qui aide l'utilisateur à répondre dans une conversation de type ${conversationType}.

${typeInstructions}

**Phase actuelle:** ${conversationPhase}
${phaseInstructions}
${meetingContextPrompt}
${questionRequestPrompt}

**Conversation récente:**
${recentConversation}

**Tâche:** Génère 3 suggestions de réponse contextuelles pour l'utilisateur.

**Exigences:**
1. Chaque suggestion doit être SPÉCIFIQUE au contexte de la conversation ci-dessus
2. Varie les approches: une question, une affirmation/accord, une proposition orientée action
3. Garde chaque suggestion sous 25 mots
4. Reste naturel et conversationnel
5. Fais avancer la conversation vers ${this._getPhaseGoal(conversationPhase)}
6. N'utilise JAMAIS de phrases génériques comme "c'est intéressant", "dis-m'en plus", "je vois"
7. RÉPONDS TOUJOURS EN FRANÇAIS

**Format:**
1. [Première suggestion]
2. [Deuxième suggestion]
3. [Troisième suggestion]

Génère UNIQUEMENT les suggestions numérotées. Pas d'explications ni de commentaires.`;
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

            // Build intelligent, context-aware prompt
            const smartPrompt = this._buildSmartPrompt(enrichedContext);

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

            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.8, // Higher for more creative suggestions
                maxTokens: 300, // Keep it short
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
