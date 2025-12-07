/**
 * Application Configuration
 *
 * Centralized configuration for hardcoded values and environment settings.
 * This eliminates magic numbers and hardcoded URLs scattered across the codebase.
 */

const config = {
    /**
     * URL configurations
     */
    urls: {
        web: process.env.LUCIDE_WEB_URL || 'https://app.lucide.ai',
        api: process.env.LUCIDE_API_URL || 'https://api.lucide.ai',
        docs: process.env.LUCIDE_DOCS_URL || 'https://docs.lucide.ai'
    },

    /**
     * UI/UX limits
     */
    limits: {
        // Tags
        maxTags: 20,
        maxTagLength: 50,

        // Scroll behavior
        scrollAmount: 100,

        // Input limits
        maxTitleLength: 200,
        maxDescriptionLength: 2000,

        // List pagination
        defaultPageSize: 50,
        maxPageSize: 200
    },

    /**
     * AI model token limits
     * Note: These may change, consider fetching from API for production
     */
    ai: {
        tokenLimits: {
            'gpt-4': 8192,
            'gpt-4-turbo': 128000,
            'gpt-4o': 128000,
            'gpt-4o-mini': 128000,
            'gpt-3.5-turbo': 16385,
            'claude-3-opus': 200000,
            'claude-3-sonnet': 200000,
            'claude-3-haiku': 200000,
            'claude-3-5-sonnet': 200000,
            'gemini-pro': 32000,
            'gemini-1.5-pro': 1000000,
            'gemini-1.5-flash': 1000000
        },

        // Default output token limits for responses
        defaultMaxOutputTokens: 4096,

        // Structured notes specific limits
        structuredNotes: {
            maxInputTokens: 6000,
            reservedOutputTokens: 2000
        }
    },

    /**
     * Validation patterns
     */
    validation: {
        // License key: alphanumeric with dashes, 16-64 chars
        licenseKey: /^[A-Za-z0-9-]{16,64}$/,

        // Email pattern
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

        // URL pattern (basic)
        url: /^https?:\/\/.+/i
    },

    /**
     * Timeout configurations (in milliseconds)
     */
    timeouts: {
        // API calls
        apiRequest: 30000,
        llmRequest: 120000,

        // UI interactions
        debounce: 300,
        throttle: 100,

        // Cleanup operations
        tempFileCleanup: 5000
    },

    /**
     * Feature flags
     */
    features: {
        enableDebugLogging: process.env.NODE_ENV === 'development',
        enableAnalytics: process.env.NODE_ENV === 'production',
        enableExperimentalFeatures: process.env.ENABLE_EXPERIMENTAL === 'true'
    },

    /**
     * Window dimensions
     */
    windows: {
        header: {
            main: { width: 405, height: 47 },
            apiKey: { width: 456, height: 370 },
            welcome: { width: 456, height: 364 },
            permission: { width: 285, height: 220 }
        }
    }
};

/**
 * Get token limit for a model
 * @param {string} modelId - Model identifier
 * @returns {number} - Token limit
 */
function getTokenLimit(modelId) {
    // Try exact match first
    if (config.ai.tokenLimits[modelId]) {
        return config.ai.tokenLimits[modelId];
    }

    // Try partial match for model families
    const lowerModelId = modelId.toLowerCase();

    if (lowerModelId.includes('gpt-4o')) return config.ai.tokenLimits['gpt-4o'];
    if (lowerModelId.includes('gpt-4-turbo')) return config.ai.tokenLimits['gpt-4-turbo'];
    if (lowerModelId.includes('gpt-4')) return config.ai.tokenLimits['gpt-4'];
    if (lowerModelId.includes('gpt-3.5')) return config.ai.tokenLimits['gpt-3.5-turbo'];
    if (lowerModelId.includes('claude-3-5')) return config.ai.tokenLimits['claude-3-5-sonnet'];
    if (lowerModelId.includes('claude-3')) return config.ai.tokenLimits['claude-3-sonnet'];
    if (lowerModelId.includes('gemini-1.5')) return config.ai.tokenLimits['gemini-1.5-pro'];
    if (lowerModelId.includes('gemini')) return config.ai.tokenLimits['gemini-pro'];

    // Default fallback
    return 8000;
}

/**
 * Validate a value against a pattern
 * @param {string} patternName - Pattern name from config.validation
 * @param {string} value - Value to validate
 * @returns {boolean}
 */
function validate(patternName, value) {
    const pattern = config.validation[patternName];
    if (!pattern) {
        console.warn(`Unknown validation pattern: ${patternName}`);
        return false;
    }
    return pattern.test(value);
}

module.exports = {
    config,
    getTokenLimit,
    validate
};
