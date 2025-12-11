/**
 * Contextual Analysis Service - Phase 3.4 + Factual Insights
 * AI-powered analysis for deeper insight generation and context understanding
 * Enhanced with Knowledge Base integration for factual, expert-level insights
 */

const aiService = require('../../common/services/aiService');
const ragService = require('../../common/services/ragService');
const authService = require('../../common/services/authService');

/**
 * Sentiment Types
 */
const Sentiment = {
    POSITIVE: 'positive',       // Optimistic, enthusiastic
    NEUTRAL: 'neutral',         // Factual, balanced
    NEGATIVE: 'negative',       // Concerned, frustrated
    URGENT: 'urgent',          // Time-sensitive, pressing
    COLLABORATIVE: 'collaborative' // Team-focused, cooperative
};

class ContextualAnalysisService {
    constructor() {
        this.conversationContext = [];
        this.lastAnalysis = null;
        this.analysisCache = new Map();
        // Fix MEDIUM BUG-M5: Add limit for analysisCache to prevent unbounded memory growth
        this.MAX_CACHE_SIZE = 100;
        this.isAnalyzing = false;

        console.log('[ContextualAnalysisService] Initialized');
    }

    /**
     * Reset conversation context
     */
    reset() {
        this.conversationContext = [];
        this.lastAnalysis = null;
        this.analysisCache.clear();
        this.isAnalyzing = false;
        console.log('[ContextualAnalysisService] Context reset');
    }

    /**
     * Add conversation turn to context buffer
     */
    addConversationTurn(speaker, text) {
        this.conversationContext.push({
            speaker,
            text,
            timestamp: Date.now()
        });

        // Keep last 20 turns for context
        if (this.conversationContext.length > 20) {
            this.conversationContext.shift();
        }
    }

    /**
     * Analyze sentiment of a text
     * @param {string} text - Text to analyze
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Sentiment analysis
     */
    async analyzeSentiment(text, context = {}) {
        if (!text || text.trim().length < 10) {
            return { sentiment: Sentiment.NEUTRAL, confidence: 0.5 };
        }

        try {
            const prompt = this._buildSentimentPrompt(text, context);

            const response = await aiService.generateResponse(prompt, {
                model: 'gpt-4o',
                maxTokens: 200,
                temperature: 0.3
            });

            return this._parseSentimentResponse(response);
        } catch (error) {
            console.error('[ContextualAnalysis] Sentiment analysis error:', error);
            return { sentiment: Sentiment.NEUTRAL, confidence: 0.5 };
        }
    }

    /**
     * Generate proactive suggestions based on conversation context
     * @param {Array} insights - Current insights
     * @returns {Promise<Array>} Proactive suggestions
     */
    async generateProactiveSuggestions(insights) {
        if (this.conversationContext.length < 5) {
            return []; // Need some context first
        }

        if (this.isAnalyzing) {
            return []; // Don't overwhelm with multiple analyses
        }

        try {
            this.isAnalyzing = true;

            const prompt = this._buildProactiveSuggestionsPrompt(insights);

            const response = await aiService.generateResponse(prompt, {
                model: 'gpt-4o',
                maxTokens: 800,
                temperature: 0.7
            });

            const suggestions = this._parseProactiveSuggestions(response);

            this.lastAnalysis = {
                suggestions,
                timestamp: Date.now()
            };

            return suggestions;
        } catch (error) {
            console.error('[ContextualAnalysis] Proactive suggestions error:', error);
            return [];
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Generate multi-angle factual response suggestions based on conversation context and Knowledge Base
     * Returns 2-4 different perspectives (Technical, Business, Risk, Innovation) in 15-30 words each
     * @param {Array} insights - Current insights
     * @returns {Promise<Array>} Multi-angle factual responses
     */
    async generateMultiAngleResponses(insights) {
        if (this.conversationContext.length < 3) {
            return []; // Need some context first
        }

        if (this.isAnalyzing) {
            return []; // Don't overwhelm with multiple analyses
        }

        try {
            this.isAnalyzing = true;

            // Extract main topic from recent conversation
            const mainTopic = this._extractMainTopic();

            // Try to get KB context for enrichment
            const kbContext = await this._getKBContext(mainTopic);

            const prompt = this._buildMultiAngleResponsesPrompt(insights, kbContext);

            const response = await aiService.generateResponse(prompt, {
                model: 'gpt-4o',
                maxTokens: 800,
                temperature: 0.5 // Balanced for diverse perspectives
            });

            const responses = this._parseMultiAngleResponses(response);

            this.lastAnalysis = {
                responses,
                timestamp: Date.now(),
                hasKBContext: !!kbContext
            };

            console.log(`[ContextualAnalysis] Generated ${responses.length} multi-angle responses${kbContext ? ' (with KB)' : ''}`);

            return responses;
        } catch (error) {
            console.error('[ContextualAnalysis] Factual insights error:', error);
            return [];
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Extract main topic from recent conversation for KB search
     * @private
     * @returns {string} Main topic
     */
    _extractMainTopic() {
        const recentText = this.conversationContext
            .slice(-5)
            .map(turn => turn.text)
            .join(' ');

        // Remove common words to extract key terms
        const commonWords = /\b(le|la|les|un|une|des|de|du|et|ou|en|à|pour|avec|sur|dans|que|qui|quoi|est|sont|a|ont|fait|faire|être|avoir|ce|cette|ces|je|tu|il|elle|nous|vous|ils|elles|on|the|a|an|and|or|in|to|for|with|on|that|which|is|are|has|have|do|does|this|i|you|he|she|we|they|it)\b/gi;

        return recentText
            .replace(commonWords, '')
            .replace(/[?!.,;:]/g, '')
            .trim()
            .substring(0, 150);
    }

    /**
     * Detect if the conversation contains a factual/encyclopedic question
     * requiring general knowledge answers (vs business/technical discussions)
     * @private
     * @param {string} text - Recent conversation text
     * @returns {boolean} True if this is a factual question
     */
    _isFactualQuestion(text) {
        const lowerText = text.toLowerCase();

        // Geographic/Capital/Country questions
        const geographicPatterns = [
            /\b(capitale|capital|chef-lieu)\b/i,
            /\b(pays|country|nation|continent)\b/i,
            /\b(population|habitants|superficie)\b/i,
            /\b(frontière|border|voisin)\b/i
        ];

        // Definition/Identity questions
        const definitionPatterns = [
            /\b(qu'est-ce que?|what is|c'est quoi|définition)\b/i,
            /\b(qui est|who is|qui était)\b/i,
            /\b(quel(le)? est|what is the)\b/i
        ];

        // Historical questions
        const historicalPatterns = [
            /\b(quand|when|en quelle année)\b/i,
            /\b(fondé|founded|créé|histoire)\b/i
        ];

        // Check all patterns
        for (const pattern of [...geographicPatterns, ...definitionPatterns, ...historicalPatterns]) {
            if (pattern.test(lowerText)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get relevant context from Knowledge Base
     * @private
     * @param {string} topic - Topic to search for
     * @returns {Promise<string|null>} KB context or null
     */
    async _getKBContext(topic) {
        try {
            const userId = authService.getCurrentUserId();
            if (!userId) {
                return null;
            }

            const ragContext = await ragService.retrieveContext(topic, {
                maxChunks: 3,
                minScore: 0.3 // Lowered to 0.3 for better recall in Live Insights
            });

            if (ragContext && ragContext.hasContext && ragContext.sources.length > 0) {
                console.log(`[ContextualAnalysis] KB: Found ${ragContext.sources.length} relevant sources`);
                return ragContext.sources
                    .slice(0, 2)
                    .map(s => `[${s.document_title}]: ${s.content.substring(0, 200)}`)
                    .join('\n');
            }

            return null;
        } catch (error) {
            console.warn('[ContextualAnalysis] KB lookup failed:', error.message);
            return null;
        }
    }

    /**
     * Generate intelligent summary of conversation so far
     * @returns {Promise<Object>} Summary object
     */
    async generateIntelligentSummary() {
        if (this.conversationContext.length < 3) {
            return null;
        }

        try {
            const prompt = this._buildSummaryPrompt();

            const response = await aiService.generateResponse(prompt, {
                model: 'gpt-4o',
                maxTokens: 500,
                temperature: 0.4
            });

            return this._parseSummaryResponse(response);
        } catch (error) {
            console.error('[ContextualAnalysis] Summary generation error:', error);
            return null;
        }
    }

    /**
     * Detect complex patterns using AI
     * @param {Array} recentTurns - Recent conversation turns
     * @returns {Promise<Array>} Detected patterns
     */
    async detectComplexPatterns(recentTurns = 10) {
        if (this.conversationContext.length < recentTurns) {
            return [];
        }

        const turns = this.conversationContext.slice(-recentTurns);

        try {
            const prompt = this._buildPatternDetectionPrompt(turns);

            const response = await aiService.generateResponse(prompt, {
                model: 'gpt-4o',
                maxTokens: 400,
                temperature: 0.3
            });

            return this._parsePatternResponse(response);
        } catch (error) {
            console.error('[ContextualAnalysis] Pattern detection error:', error);
            return [];
        }
    }

    /**
     * Enrich an insight with AI-powered context
     * @param {Object} insight - Raw insight
     * @returns {Promise<Object>} Enriched insight
     */
    async enrichInsight(insight) {
        try {
            // Analyze sentiment
            const sentiment = await this.analyzeSentiment(insight.content, {
                speaker: insight.speaker,
                type: insight.type
            });

            // Generate context-aware suggestions
            const suggestions = await this._generateInsightSuggestions(insight);

            return {
                ...insight,
                sentiment: sentiment.sentiment,
                sentimentConfidence: sentiment.confidence,
                aiSuggestions: suggestions,
                enrichedAt: Date.now()
            };
        } catch (error) {
            console.error('[ContextualAnalysis] Insight enrichment error:', error);
            return insight; // Return original if enrichment fails
        }
    }

    /**
     * Build sentiment analysis prompt
     * @private
     */
    _buildSentimentPrompt(text, context) {
        return `Analyze the sentiment and tone of this meeting statement:

"${text}"

Context:
- Speaker: ${context.speaker || 'Unknown'}
- Type: ${context.type || 'General'}

Respond in JSON format:
{
  "sentiment": "positive|neutral|negative|urgent|collaborative",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
    }

    /**
     * Build proactive suggestions prompt
     * @private
     */
    _buildProactiveSuggestionsPrompt(insights) {
        const recentContext = this.conversationContext.slice(-10)
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        const insightsSummary = insights
            .slice(0, 5)
            .map(i => `- ${i.type}: ${i.title}`)
            .join('\n');

        return `Based on this meeting conversation and detected insights, generate 2-3 proactive suggestions:

Recent Conversation:
${recentContext}

Detected Insights:
${insightsSummary}

Generate actionable suggestions that could help the meeting progress better.

Respond in JSON format:
{
  "suggestions": [
    {
      "title": "brief title",
      "description": "what to do",
      "priority": "high|medium|low",
      "type": "action|question|reminder",
      "reasoning": "why this helps"
    }
  ]
}`;
    }

    /**
     * Build multi-angle responses prompt - generates factual responses from different perspectives
     * Now supports TWO modes: Business (for meetings) and General Knowledge (for factual questions)
     * @private
     * @param {Array} insights - Current insights
     * @param {string|null} kbContext - Knowledge Base context if available
     */
    _buildMultiAngleResponsesPrompt(insights, kbContext) {
        const recentContext = this.conversationContext.slice(-8)
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        const insightsSummary = insights
            .slice(0, 3)
            .map(i => `- ${i.type}: ${i.title}`)
            .join('\n');

        const kbSection = kbContext
            ? `\n📚 KNOWLEDGE BASE CONTEXT (SEULEMENT si pertinent - ne pas forcer):\n${kbContext}\n`
            : '';

        // Detect if this is a general knowledge/factual question
        const isFactualQuestion = this._isFactualQuestion(recentContext);

        // Choose appropriate angles based on question type
        const anglesSection = isFactualQuestion ?
            `ANGLES POUR QUESTIONS FACTUELLES/ENCYCLOPÉDIQUES:
🏛️ **Politique/Gouvernance**: Aspect administratif, gouvernemental, institutionnel
🌍 **Culturel/Historique**: Aspect culturel, historique, social, démographique
💵 **Économique**: Aspect économique, commercial, développement
⚡ **Crises/Enjeux**: Problèmes actuels, défis, situations critiques

EXEMPLES DE BONNES RÉPONSES (pour "Quelle est la capitale de X?"):
- "🏛️ [Ville] est la capitale et siège du gouvernement depuis [année], abritant les institutions nationales"
- "🌍 Fondée en [année], la ville compte [population] habitants. Son nom signifie [signification] en langue locale"
- "💵 La ville concentre [X]% de l'économie nationale mais fait face à [crise/enjeu] depuis [année]"` :

            `ANGLES POUR DISCUSSIONS BUSINESS/TECHNIQUES:
🔧 **Technique**: Aspects techniques, architecture, implémentation
💰 **Business**: Impact financier, ROI, marché, compétitivité
⚠️ **Risque**: Risques, limitations, contraintes, précautions
💡 **Innovation**: Opportunités, nouvelles approches, tendances

EXEMPLES DE BONNES RÉPONSES:
- "🔧 Cette architecture microservices permet de scaler horizontalement avec 40% moins de serveurs"
- "💰 Le marché SaaS B2B affiche une croissance de 18% annuelle selon Gartner Q4 2024"
- "⚠️ L'adoption d'IA générative comporte des risques RGPD, 67% des entreprises reportent des audits"`;

        return `Tu es un expert qui génère des RÉPONSES FACTUELLES sous DIFFÉRENTS ANGLES.

CONVERSATION RÉCENTE:
${recentContext}

INSIGHTS DÉTECTÉS:
${insightsSummary}
${kbSection}
INSTRUCTION: Génère 3 RÉPONSES FACTUELLES sous différents angles.

RÈGLES STRICTES:
- Chaque réponse: 20-35 mots avec FAITS VÉRIFIABLES (dates, chiffres, noms)
- Ce sont des RÉPONSES, PAS des questions ni conseils
- COMMENCE chaque réponse par l'emoji de l'angle
- Sois DIRECT et INFORMATIF

${anglesSection}

EXEMPLES À ÉVITER:
- "Avez-vous pensé à..." (question)
- "Je suggère de..." (suggestion)
- "Il serait intéressant de..." (vague)

Réponds en JSON:
{
  "responses": [
    {
      "angle": "${isFactualQuestion ? 'political|cultural|economic|crisis' : 'technical|business|risk|innovation'}",
      "text": "Réponse factuelle 20-35 mots avec emoji au début",
      "hasKB": true|false,
      "confidence": 0.0-1.0
    }
  ]
}`;
    }

    /**
     * Parse multi-angle responses
     * @private
     */
    _parseMultiAngleResponses(response) {
        try {
            const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (parsed.responses && Array.isArray(parsed.responses)) {
                return parsed.responses.map(resp => ({
                    angle: resp.angle || 'technical',
                    text: resp.text || '',
                    hasKB: resp.hasKB || false,
                    confidence: resp.confidence || 0.7
                })).filter(r => r.text.length >= 15 && r.text.length <= 200); // Filter by word count range
            }

            return [];
        } catch (error) {
            console.error('[ContextualAnalysis] Failed to parse multi-angle responses:', error);
            return [];
        }
    }

    /**
     * Build summary prompt
     * @private
     */
    _buildSummaryPrompt() {
        const conversationText = this.conversationContext
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        return `Provide a concise, intelligent summary of this meeting conversation so far:

${conversationText}

Respond in JSON format:
{
  "summary": "2-3 sentence overview",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "mood": "positive|neutral|negative|collaborative",
  "progressAssessment": "on-track|needs-attention|blocked"
}`;
    }

    /**
     * Build pattern detection prompt
     * @private
     */
    _buildPatternDetectionPrompt(turns) {
        const conversationText = turns
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        return `Analyze this meeting segment for complex patterns:

${conversationText}

Look for:
- Circular discussions (same topic repeatedly)
- Escalating concerns
- Collaborative momentum
- Decision paralysis
- Alignment issues

Respond in JSON format:
{
  "patterns": [
    {
      "type": "pattern type",
      "description": "what's happening",
      "severity": "low|medium|high"
    }
  ]
}`;
    }

    /**
     * Generate suggestions for a specific insight
     * @private
     */
    async _generateInsightSuggestions(insight) {
        // For high-priority insights, generate AI suggestions
        if (insight.priority !== 'high') {
            return [];
        }

        try {
            const prompt = `Given this meeting insight:
Type: ${insight.type}
Content: "${insight.content}"

What are 1-2 immediate next steps?

Respond with brief action items only (comma-separated).`;

            const response = await aiService.generateResponse(prompt, {
                model: 'gpt-4o',
                maxTokens: 100,
                temperature: 0.5
            });

            return response.split(',').map(s => s.trim()).filter(Boolean);
        } catch (error) {
            console.error('[ContextualAnalysis] Suggestion generation error:', error);
            return [];
        }
    }

    /**
     * Parse sentiment response
     * @private
     */
    _parseSentimentResponse(response) {
        try {
            // Try to parse JSON response
            const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            return {
                sentiment: parsed.sentiment || Sentiment.NEUTRAL,
                confidence: parsed.confidence || 0.5,
                reasoning: parsed.reasoning || ''
            };
        } catch (error) {
            // Fallback: try to extract sentiment from text
            const lowerResponse = response.toLowerCase();

            if (lowerResponse.includes('positive') || lowerResponse.includes('optimistic')) {
                return { sentiment: Sentiment.POSITIVE, confidence: 0.6 };
            }
            if (lowerResponse.includes('negative') || lowerResponse.includes('concerned')) {
                return { sentiment: Sentiment.NEGATIVE, confidence: 0.6 };
            }
            if (lowerResponse.includes('urgent') || lowerResponse.includes('pressing')) {
                return { sentiment: Sentiment.URGENT, confidence: 0.6 };
            }
            if (lowerResponse.includes('collaborative') || lowerResponse.includes('cooperative')) {
                return { sentiment: Sentiment.COLLABORATIVE, confidence: 0.6 };
            }

            return { sentiment: Sentiment.NEUTRAL, confidence: 0.5 };
        }
    }

    /**
     * Parse proactive suggestions response
     * @private
     */
    _parseProactiveSuggestions(response) {
        try {
            const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            return parsed.suggestions || [];
        } catch (error) {
            console.error('[ContextualAnalysis] Failed to parse suggestions:', error);
            return [];
        }
    }

    /**
     * Parse summary response
     * @private
     */
    _parseSummaryResponse(response) {
        try {
            const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            return {
                summary: parsed.summary || '',
                keyThemes: parsed.keyThemes || [],
                mood: parsed.mood || 'neutral',
                progressAssessment: parsed.progressAssessment || 'on-track',
                generatedAt: Date.now()
            };
        } catch (error) {
            console.error('[ContextualAnalysis] Failed to parse summary:', error);
            return null;
        }
    }

    /**
     * Parse pattern response
     * @private
     */
    _parsePatternResponse(response) {
        try {
            const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            return parsed.patterns || [];
        } catch (error) {
            console.error('[ContextualAnalysis] Failed to parse patterns:', error);
            return [];
        }
    }

    /**
     * Get conversation context summary
     */
    getContextSummary() {
        return {
            turns: this.conversationContext.length,
            speakers: [...new Set(this.conversationContext.map(t => t.speaker))],
            timeRange: this.conversationContext.length > 0 ? {
                start: this.conversationContext[0].timestamp,
                end: this.conversationContext[this.conversationContext.length - 1].timestamp
            } : null,
            lastAnalysis: this.lastAnalysis
        };
    }
}

// Singleton instance
const contextualAnalysisService = new ContextualAnalysisService();

// Export service and types
contextualAnalysisService.Sentiment = Sentiment;

module.exports = contextualAnalysisService;
