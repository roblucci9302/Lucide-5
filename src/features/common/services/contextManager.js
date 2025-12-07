/**
 * Context Manager - Intelligent Context Window Management
 *
 * Centralized service for managing conversation context across all services.
 * Features:
 * - Token-aware context sizing based on model capabilities
 * - Question extraction and preservation
 * - Smart message prioritization
 * - Unified context limits across services
 *
 * Fixes issues with Command+S precision loss in long conversations by:
 * - Using model token limits instead of arbitrary message counts
 * - Preserving question context even during truncation
 * - Prioritizing recent and important messages
 */

const { getTokenLimit, getOutputLimit } = require('../config/modelLimits');
const tokenTrackingService = require('./tokenTrackingService');

class ContextManager {
    constructor() {
        // Default context allocation percentages
        this.config = {
            // Reserve this percentage of context for AI response
            outputReservePercent: 0.25,
            // Reserve this percentage for system prompt
            systemPromptReservePercent: 0.15,
            // Minimum messages to always include (most recent)
            minRecentMessages: 5,
            // Maximum messages regardless of token budget (safety limit)
            maxMessages: 100,
            // Token overhead per message (role, formatting, etc.)
            messageOverhead: 4,
            // Default fallback if model unknown
            defaultContextSize: 4096
        };

        // Question detection patterns (French + English)
        this.questionPatterns = {
            // Direct question markers
            interrogative: /[?؟？]/,
            // French question words
            frenchKeywords: /\b(qui|que|quoi|où|quand|comment|pourquoi|combien|quel|quelle|quels|quelles|est-ce que|qu'est-ce|lequel|laquelle|lesquels|lesquelles)\b/i,
            // English question words
            englishKeywords: /\b(who|what|where|when|why|how|which|whose|whom|can|could|would|should|will|is|are|do|does|did|have|has|had)\b/i,
            // Request patterns
            requestPatterns: /\b(peux-tu|pouvez-vous|peux tu|pouvez vous|can you|could you|please|s'il te plaît|s'il vous plaît|explique|explain|décris|describe|donne|give|montre|show|aide|help)\b/i
        };
    }

    /**
     * Calculate available token budget for context
     * @param {string} model - Model name
     * @param {number} systemPromptTokens - Estimated system prompt tokens
     * @returns {Object} Token budget breakdown
     */
    calculateTokenBudget(model, systemPromptTokens = 0) {
        const contextLimit = getTokenLimit(model) || this.config.defaultContextSize;
        const outputLimit = getOutputLimit(model);

        // Calculate reserved tokens
        const outputReserve = Math.min(
            Math.ceil(contextLimit * this.config.outputReservePercent),
            outputLimit
        );

        // Available for conversation context
        const availableForContext = contextLimit - outputReserve - systemPromptTokens;

        return {
            totalContextWindow: contextLimit,
            outputReserve,
            systemPromptTokens,
            availableForConversation: Math.max(availableForContext, 1000), // Minimum 1000 tokens
            model
        };
    }

    /**
     * Estimate tokens for a single message
     * @param {Object} message - Message object with role and content
     * @returns {number} Estimated token count
     */
    estimateMessageTokens(message) {
        let tokens = this.config.messageOverhead;

        const content = message.content;

        if (typeof content === 'string') {
            tokens += tokenTrackingService.estimateTokens(content);
        } else if (Array.isArray(content)) {
            // Multimodal content
            for (const block of content) {
                if (block.type === 'text' && block.text) {
                    tokens += tokenTrackingService.estimateTokens(block.text);
                } else if (block.type === 'image_url') {
                    tokens += 100; // Conservative estimate for images
                }
            }
        }

        return tokens;
    }

    /**
     * Check if a text contains a question
     * @param {string} text - Text to analyze
     * @returns {Object} Analysis result with isQuestion and confidence
     */
    detectQuestion(text) {
        if (!text || typeof text !== 'string') {
            return { isQuestion: false, confidence: 0, markers: [] };
        }

        const markers = [];
        let confidence = 0;

        // Check for question mark (highest confidence)
        if (this.questionPatterns.interrogative.test(text)) {
            markers.push('question_mark');
            confidence += 0.5;
        }

        // Check for French question words
        if (this.questionPatterns.frenchKeywords.test(text)) {
            markers.push('french_keyword');
            confidence += 0.3;
        }

        // Check for English question words
        if (this.questionPatterns.englishKeywords.test(text)) {
            markers.push('english_keyword');
            confidence += 0.3;
        }

        // Check for request patterns
        if (this.questionPatterns.requestPatterns.test(text)) {
            markers.push('request_pattern');
            confidence += 0.2;
        }

        return {
            isQuestion: confidence >= 0.3,
            confidence: Math.min(confidence, 1.0),
            markers
        };
    }

    /**
     * Extract all questions from a conversation
     * @param {Array} messages - Array of messages
     * @returns {Array} Array of question objects with index and analysis
     */
    extractQuestions(messages) {
        if (!Array.isArray(messages)) return [];

        const questions = [];

        messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                const content = typeof msg.content === 'string'
                    ? msg.content
                    : (msg.content?.[0]?.text || '');

                const analysis = this.detectQuestion(content);

                if (analysis.isQuestion) {
                    questions.push({
                        index,
                        message: msg,
                        analysis,
                        tokens: this.estimateMessageTokens(msg)
                    });
                }
            }
        });

        return questions;
    }

    /**
     * Score message importance for context selection
     * @param {Object} message - Message to score
     * @param {number} index - Position in conversation
     * @param {number} totalMessages - Total messages count
     * @returns {number} Importance score (higher = more important)
     */
    scoreMessageImportance(message, index, totalMessages) {
        let score = 0;

        // Recency bonus (recent messages are more important)
        const recencyFactor = index / totalMessages;
        score += recencyFactor * 50;

        // Question bonus (questions are important to preserve)
        const content = typeof message.content === 'string'
            ? message.content
            : (message.content?.[0]?.text || '');

        const questionAnalysis = this.detectQuestion(content);
        if (questionAnalysis.isQuestion) {
            score += questionAnalysis.confidence * 30;
        }

        // User messages slightly more important (they contain the actual questions)
        if (message.role === 'user') {
            score += 10;
        }

        // Length bonus (longer messages often contain more context)
        const tokens = this.estimateMessageTokens(message);
        if (tokens > 50) score += 5;
        if (tokens > 200) score += 10;

        return score;
    }

    /**
     * Select optimal messages to fit within token budget
     * Prioritizes recent messages and questions
     *
     * @param {Array} messages - All available messages
     * @param {number} tokenBudget - Maximum tokens to use
     * @param {Object} options - Selection options
     * @returns {Array} Selected messages within budget
     */
    selectMessagesForContext(messages, tokenBudget, options = {}) {
        if (!Array.isArray(messages) || messages.length === 0) {
            return [];
        }

        const {
            preserveQuestions = true,
            minRecent = this.config.minRecentMessages,
            maxMessages = this.config.maxMessages
        } = options;

        // Always include the most recent messages
        const recentMessages = messages.slice(-minRecent);
        let usedTokens = recentMessages.reduce(
            (sum, msg) => sum + this.estimateMessageTokens(msg),
            0
        );

        // If recent messages already exceed budget, return them anyway (minimum context)
        if (usedTokens >= tokenBudget) {
            console.log(`[ContextManager] Recent ${minRecent} messages already use ${usedTokens} tokens (budget: ${tokenBudget})`);
            return recentMessages;
        }

        // Remaining budget for additional messages
        const remainingBudget = tokenBudget - usedTokens;

        // Score all older messages
        const olderMessages = messages.slice(0, -minRecent);
        const scoredMessages = olderMessages.map((msg, idx) => ({
            message: msg,
            originalIndex: idx,
            score: this.scoreMessageImportance(msg, idx, messages.length),
            tokens: this.estimateMessageTokens(msg),
            isQuestion: this.detectQuestion(
                typeof msg.content === 'string' ? msg.content : (msg.content?.[0]?.text || '')
            ).isQuestion
        }));

        // Sort by importance score (highest first)
        scoredMessages.sort((a, b) => b.score - a.score);

        // Select messages within budget, prioritizing questions if enabled
        const selectedOlder = [];
        let additionalTokens = 0;

        // First pass: select questions
        if (preserveQuestions) {
            for (const scored of scoredMessages) {
                if (scored.isQuestion && additionalTokens + scored.tokens <= remainingBudget) {
                    selectedOlder.push(scored);
                    additionalTokens += scored.tokens;
                }
            }
        }

        // Second pass: select remaining high-score messages
        for (const scored of scoredMessages) {
            if (selectedOlder.includes(scored)) continue; // Already selected
            if (selectedOlder.length + minRecent >= maxMessages) break; // Max limit

            if (additionalTokens + scored.tokens <= remainingBudget) {
                selectedOlder.push(scored);
                additionalTokens += scored.tokens;
            }
        }

        // Sort selected older messages by original index to maintain chronological order
        selectedOlder.sort((a, b) => a.originalIndex - b.originalIndex);

        // Combine: older selected messages + recent messages
        const result = [
            ...selectedOlder.map(s => s.message),
            ...recentMessages
        ];

        console.log(`[ContextManager] Selected ${result.length}/${messages.length} messages (${usedTokens + additionalTokens}/${tokenBudget} tokens)`);
        console.log(`[ContextManager]    - Recent: ${minRecent}, Additional: ${selectedOlder.length}`);
        console.log(`[ContextManager]    - Questions preserved: ${selectedOlder.filter(s => s.isQuestion).length}`);

        return result;
    }

    /**
     * Build optimized context for a conversation
     * Main entry point for services to get properly sized context
     *
     * @param {Object} params - Context building parameters
     * @param {Array} params.messages - All conversation messages
     * @param {string} params.model - Model being used
     * @param {number} params.systemPromptTokens - System prompt token count
     * @param {Object} params.options - Additional options
     * @returns {Object} Optimized context with messages and metadata
     */
    buildContext({ messages, model, systemPromptTokens = 500, options = {} }) {
        // Calculate token budget
        const budget = this.calculateTokenBudget(model, systemPromptTokens);

        console.log(`[ContextManager] Building context for ${model}`);
        console.log(`[ContextManager]    - Context window: ${budget.totalContextWindow} tokens`);
        console.log(`[ContextManager]    - Available for conversation: ${budget.availableForConversation} tokens`);
        console.log(`[ContextManager]    - Input messages: ${messages?.length || 0}`);

        // Select optimal messages
        const selectedMessages = this.selectMessagesForContext(
            messages,
            budget.availableForConversation,
            options
        );

        // Extract questions from selected context for reference
        const questions = this.extractQuestions(selectedMessages);

        // Calculate actual token usage
        const totalTokens = selectedMessages.reduce(
            (sum, msg) => sum + this.estimateMessageTokens(msg),
            0
        );

        return {
            messages: selectedMessages,
            metadata: {
                originalCount: messages?.length || 0,
                selectedCount: selectedMessages.length,
                tokensUsed: totalTokens,
                tokenBudget: budget.availableForConversation,
                questionsPreserved: questions.length,
                model,
                truncated: (messages?.length || 0) > selectedMessages.length
            }
        };
    }

    /**
     * Get context summary for logging
     * @param {Object} contextResult - Result from buildContext
     * @returns {string} Human-readable summary
     */
    getSummary(contextResult) {
        const { metadata } = contextResult;
        return `Context: ${metadata.selectedCount}/${metadata.originalCount} msgs, ${metadata.tokensUsed}/${metadata.tokenBudget} tokens, ${metadata.questionsPreserved} questions preserved${metadata.truncated ? ' (truncated)' : ''}`;
    }
}

// Singleton instance
const contextManager = new ContextManager();

module.exports = contextManager;
