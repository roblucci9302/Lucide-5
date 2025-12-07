/**
 * Token Tracking Service
 *
 * Tracks token usage and costs across all LLM providers (OpenAI, Anthropic, Gemini, etc.)
 * Provides real-time usage monitoring and cost estimation.
 */

const Store = require('electron-store');

// Provider pricing per 1M tokens (USD)
const PRICING_CONFIG = {
    'openai': {
        'gpt-4': { input: 30.00, output: 60.00 },
        'gpt-4-turbo': { input: 10.00, output: 30.00 },
        'gpt-4o': { input: 5.00, output: 15.00 },
        'gpt-4o-mini': { input: 0.150, output: 0.600 },
        'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
        'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 }
    },
    'anthropic': {
        'claude-3-opus': { input: 15.00, output: 75.00 },
        'claude-3-sonnet': { input: 3.00, output: 15.00 },
        'claude-3-haiku': { input: 0.25, output: 1.25 },
        'claude-3.5-sonnet': { input: 3.00, output: 15.00 }
    },
    'gemini': {
        'gemini-pro': { input: 0.50, output: 1.50 },
        'gemini-pro-vision': { input: 0.50, output: 1.50 },
        'gemini-1.5-pro': { input: 1.25, output: 5.00 },
        'gemini-1.5-flash': { input: 0.075, output: 0.30 }
    },
    'ollama': {
        // Local models - free
        'default': { input: 0, output: 0 }
    }
};

class TokenTrackingService {
    constructor() {
        this.store = new Store({
            name: 'token-usage',
            defaults: {
                totalTokens: 0,
                totalCost: 0,
                sessionUsage: {},
                dailyUsage: {},
                providerBreakdown: {}
            }
        });

        // Fix MEDIUM BUG-M10: Current session usage now synced with persisted store
        // Instead of keeping in memory, we'll read from store on demand
        this.currentSessionId = null; // Track current session ID for persistence
        this.currentSessionUsage = {
            tokens: 0,
            cost: 0,
            breakdown: {}
        };

        // Fix MEDIUM BUG-M9: Add lock to prevent race conditions in store updates
        this.updateLock = null; // Promise to track ongoing updates

        console.log('[TokenTrackingService] Initialized');
    }

    /**
     * Fix MEDIUM BUG-M10: Set current session for tracking
     * Ensures session token usage persists across restarts via electron-store
     */
    setCurrentSession(sessionId) {
        this.currentSessionId = sessionId;
        // Load existing usage from persisted store
        const sessionUsage = this.store.get('sessionUsage') || {};
        if (sessionUsage[sessionId]) {
            this.currentSessionUsage = { ...sessionUsage[sessionId] };
            console.log(`[TokenTrackingService] Loaded session ${sessionId} usage:`, this.currentSessionUsage);
        } else {
            this.currentSessionUsage = {
                tokens: 0,
                cost: 0,
                breakdown: {}
            };
            console.log(`[TokenTrackingService] Started tracking new session: ${sessionId}`);
        }
    }

    /**
     * Fix MEDIUM BUG-M10: Get current session usage (reads from persisted store)
     */
    getCurrentSessionUsage() {
        if (!this.currentSessionId) {
            return this.currentSessionUsage;
        }
        // Always return fresh data from persisted store
        const sessionUsage = this.store.get('sessionUsage') || {};
        return sessionUsage[this.currentSessionId] || this.currentSessionUsage;
    }

    /**
     * Extract token usage from LLM response
     * Normalizes different provider formats into consistent structure
     *
     * @param {string} provider - Provider name (openai, anthropic, gemini, etc.)
     * @param {Object} response - Raw LLM response object
     * @returns {Object} Normalized token usage { inputTokens, outputTokens, totalTokens }
     */
    extractTokenUsage(provider, response) {
        try {
            let inputTokens = 0;
            let outputTokens = 0;

            switch (provider.toLowerCase()) {
                case 'openai':
                case 'openai-lucide':
                    // OpenAI format: response.raw.usage
                    if (response?.raw?.usage) {
                        inputTokens = response.raw.usage.prompt_tokens || 0;
                        outputTokens = response.raw.usage.completion_tokens || 0;
                    }
                    // Alternative: response.usage
                    else if (response?.usage) {
                        inputTokens = response.usage.prompt_tokens || 0;
                        outputTokens = response.usage.completion_tokens || 0;
                    }
                    break;

                case 'anthropic':
                case 'claude':
                    // Anthropic format: response.raw.usage
                    if (response?.raw?.usage) {
                        inputTokens = response.raw.usage.input_tokens || 0;
                        outputTokens = response.raw.usage.output_tokens || 0;
                    }
                    // Alternative: response.usage
                    else if (response?.usage) {
                        inputTokens = response.usage.input_tokens || 0;
                        outputTokens = response.usage.output_tokens || 0;
                    }
                    break;

                case 'gemini':
                case 'google':
                    // Gemini format: result.usageMetadata
                    if (response?.usageMetadata) {
                        inputTokens = response.usageMetadata.promptTokenCount || 0;
                        outputTokens = response.usageMetadata.candidatesTokenCount || 0;
                    }
                    // Alternative nested format
                    else if (response?.raw?.usageMetadata) {
                        inputTokens = response.raw.usageMetadata.promptTokenCount || 0;
                        outputTokens = response.raw.usageMetadata.candidatesTokenCount || 0;
                    }
                    break;

                case 'ollama':
                    // Ollama runs locally - no token tracking needed
                    console.log('[TokenTrackingService] Ollama detected - local model, no cost');
                    return {
                        inputTokens: 0,
                        outputTokens: 0,
                        totalTokens: 0,
                        estimated: false,
                        local: true
                    };

                default:
                    console.warn(`[TokenTrackingService] Unknown provider: ${provider}`);
                    return {
                        inputTokens: 0,
                        outputTokens: 0,
                        totalTokens: 0,
                        estimated: false,
                        error: 'Unknown provider'
                    };
            }

            const totalTokens = inputTokens + outputTokens;

            return {
                inputTokens,
                outputTokens,
                totalTokens,
                estimated: false
            };
        } catch (error) {
            console.error('[TokenTrackingService] Error extracting tokens:', error);
            return {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                estimated: false,
                error: error.message
            };
        }
    }

    /**
     * Estimate tokens for streaming responses (fallback when usage data unavailable)
     * Fix MEDIUM BUG-M11: Improved token estimation with better heuristics
     *
     * More accurate than simple char/4, though not as precise as tiktoken
     * Based on empirical observations of GPT tokenization patterns
     *
     * @param {string} text - Generated text content
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        if (!text) return 0;

        // Fix MEDIUM BUG-M11: Improved heuristic for token estimation
        // Split by whitespace and punctuation for better word-level counting
        const words = text.split(/\s+/).filter(w => w.length > 0);
        let tokenCount = 0;

        for (const word of words) {
            // Short words (1-4 chars): usually 1 token
            if (word.length <= 4) {
                tokenCount += 1;
            }
            // Medium words (5-8 chars): usually 1-2 tokens
            else if (word.length <= 8) {
                tokenCount += Math.ceil(word.length / 5);
            }
            // Long words (9+ chars): often split into multiple tokens
            // Estimate: ~1 token per 4 characters for long words
            else {
                tokenCount += Math.ceil(word.length / 4);
            }

            // Add extra token for punctuation attached to words
            const punctuationCount = (word.match(/[.,!?;:()[\]{}'"]/g) || []).length;
            tokenCount += punctuationCount * 0.5; // Punctuation often shares tokens
        }

        // Add tokens for newlines and special formatting
        const newlineCount = (text.match(/\n/g) || []).length;
        tokenCount += newlineCount * 0.3; // Newlines add fractional tokens

        // Round up final count
        return Math.ceil(tokenCount);
    }

    /**
     * Calculate cost for token usage
     *
     * @param {string} provider - Provider name
     * @param {string} model - Model name
     * @param {number} inputTokens - Input token count
     * @param {number} outputTokens - Output token count
     * @returns {number} Cost in USD
     */
    calculateCost(provider, model, inputTokens, outputTokens) {
        try {
            const providerPricing = PRICING_CONFIG[provider.toLowerCase()];
            if (!providerPricing) {
                console.warn(`[TokenTrackingService] No pricing for provider: ${provider}`);
                return 0;
            }

            // Find model pricing with proper specificity matching
            let modelPricing = null;
            const modelLower = model.toLowerCase();

            // Step 1: Try exact match first (most reliable)
            if (providerPricing[modelLower]) {
                modelPricing = providerPricing[modelLower];
            }

            // Step 2: Sort keys by length descending to match most specific first
            // This ensures "gpt-4o-mini" matches before "gpt-4o" or "gpt-4"
            if (!modelPricing) {
                const sortedKeys = Object.keys(providerPricing)
                    .filter(k => k !== 'default')
                    .sort((a, b) => b.length - a.length);

                for (const modelKey of sortedKeys) {
                    if (modelLower.includes(modelKey.toLowerCase())) {
                        modelPricing = providerPricing[modelKey];
                        break;
                    }
                }
            }

            // Step 3: Fallback to default if available
            if (!modelPricing) {
                modelPricing = providerPricing['default'] || null;
            }

            if (!modelPricing) {
                console.warn(`[TokenTrackingService] No pricing for model: ${model}`);
                return 0;
            }

            // Calculate cost (pricing is per 1M tokens)
            const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
            const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
            const totalCost = inputCost + outputCost;

            return totalCost;
        } catch (error) {
            console.error('[TokenTrackingService] Error calculating cost:', error);
            return 0;
        }
    }

    /**
     * Track token usage for a single LLM call
     *
     * @param {Object} params - Tracking parameters
     * @param {string} params.provider - Provider name
     * @param {string} params.model - Model name
     * @param {Object} params.response - LLM response object
     * @param {string} params.sessionId - Session ID
     * @param {string} params.feature - Feature name (ask, summary, response, etc.)
     * @returns {Object} Usage data with cost
     */
    trackUsage({ provider, model, response, sessionId, feature = 'unknown' }) {
        try {
            // Extract tokens from response
            const usage = this.extractTokenUsage(provider, response);

            // Calculate cost
            const cost = this.calculateCost(
                provider,
                model,
                usage.inputTokens,
                usage.outputTokens
            );

            const usageData = {
                provider,
                model,
                feature,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
                cost,
                estimated: usage.estimated,
                timestamp: Date.now()
            };

            console.log(`[TokenTrackingService] Tracked usage:`, {
                feature,
                provider,
                model,
                tokens: usage.totalTokens,
                cost: `$${cost.toFixed(4)}`
            });

            // Update session usage
            if (sessionId) {
                this.updateSessionUsage(sessionId, usageData);
            }

            // Update global stats
            this.updateGlobalStats(usageData);

            return usageData;
        } catch (error) {
            console.error('[TokenTrackingService] Error tracking usage:', error);
            return null;
        }
    }

    /**
     * Update session usage statistics
     * Fix MEDIUM BUG-M9: Make atomic to prevent race conditions
     */
    async updateSessionUsage(sessionId, usageData) {
        // Wait for any ongoing update to complete
        if (this.updateLock) {
            await this.updateLock;
        }

        // Create new lock
        let resolveLock;
        this.updateLock = new Promise(resolve => {
            resolveLock = resolve;
        });

        try {
            // Perform atomic read-modify-write
            const sessionUsage = this.store.get('sessionUsage') || {};

            if (!sessionUsage[sessionId]) {
                sessionUsage[sessionId] = {
                    tokens: 0,
                    cost: 0,
                    calls: 0,
                    breakdown: {}
                };
            }

            sessionUsage[sessionId].tokens += usageData.totalTokens;
            sessionUsage[sessionId].cost += usageData.cost;
            sessionUsage[sessionId].calls += 1;

            // Breakdown by feature
            const feature = usageData.feature;
            if (!sessionUsage[sessionId].breakdown[feature]) {
                sessionUsage[sessionId].breakdown[feature] = {
                    tokens: 0,
                    cost: 0,
                    calls: 0
                };
            }

            sessionUsage[sessionId].breakdown[feature].tokens += usageData.totalTokens;
            sessionUsage[sessionId].breakdown[feature].cost += usageData.cost;
            sessionUsage[sessionId].breakdown[feature].calls += 1;

            this.store.set('sessionUsage', sessionUsage);
        } finally {
            // Release lock
            resolveLock();
            this.updateLock = null;
        }
    }

    /**
     * Update global statistics
     */
    updateGlobalStats(usageData) {
        // Total tokens and cost
        const totalTokens = this.store.get('totalTokens') || 0;
        const totalCost = this.store.get('totalCost') || 0;

        this.store.set('totalTokens', totalTokens + usageData.totalTokens);
        this.store.set('totalCost', totalCost + usageData.cost);

        // Daily usage
        const today = new Date().toISOString().split('T')[0];
        const dailyUsage = this.store.get('dailyUsage') || {};

        if (!dailyUsage[today]) {
            dailyUsage[today] = {
                tokens: 0,
                cost: 0,
                calls: 0
            };
        }

        dailyUsage[today].tokens += usageData.totalTokens;
        dailyUsage[today].cost += usageData.cost;
        dailyUsage[today].calls += 1;

        this.store.set('dailyUsage', dailyUsage);

        // Provider breakdown
        const providerBreakdown = this.store.get('providerBreakdown') || {};
        const providerKey = `${usageData.provider}-${usageData.model}`;

        if (!providerBreakdown[providerKey]) {
            providerBreakdown[providerKey] = {
                tokens: 0,
                cost: 0,
                calls: 0
            };
        }

        providerBreakdown[providerKey].tokens += usageData.totalTokens;
        providerBreakdown[providerKey].cost += usageData.cost;
        providerBreakdown[providerKey].calls += 1;

        this.store.set('providerBreakdown', providerBreakdown);
    }

    /**
     * Get session usage statistics
     */
    getSessionUsage(sessionId) {
        const sessionUsage = this.store.get('sessionUsage') || {};
        return sessionUsage[sessionId] || {
            tokens: 0,
            cost: 0,
            calls: 0,
            breakdown: {}
        };
    }

    /**
     * Get global usage statistics
     */
    getGlobalStats() {
        return {
            totalTokens: this.store.get('totalTokens') || 0,
            totalCost: this.store.get('totalCost') || 0,
            dailyUsage: this.store.get('dailyUsage') || {},
            providerBreakdown: this.store.get('providerBreakdown') || {}
        };
    }

    /**
     * Get today's usage
     */
    getTodayUsage() {
        const today = new Date().toISOString().split('T')[0];
        const dailyUsage = this.store.get('dailyUsage') || {};

        return dailyUsage[today] || {
            tokens: 0,
            cost: 0,
            calls: 0
        };
    }

    /**
     * Reset usage statistics (for testing or new billing period)
     */
    resetStats() {
        this.store.clear();
        console.log('[TokenTrackingService] Stats reset');
    }
}

// Singleton instance
const tokenTrackingService = new TokenTrackingService();

module.exports = tokenTrackingService;
