/**
 * Model Token Limits Configuration
 * Centralized token limits to eliminate inconsistencies across the codebase
 *
 * IMPORTANT: This file is the single source of truth for model token limits.
 * Previously, inconsistent values were found:
 *   - structuredNotesService.js: gpt-4-turbo = 100,000
 *   - appConfig.js: gpt-4-turbo = 128,000
 *   - documentLengthDetector.js: gpt-4-turbo = 4,096
 *
 * These have been consolidated here with correct values from official documentation.
 */

/**
 * Token limits for various AI models
 * Values based on official documentation as of 2024
 */
const MODEL_TOKEN_LIMITS = {
    // ========================================================================
    // OpenAI Models
    // ========================================================================
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 16385,
    'gpt-3.5-turbo-16k': 16385,

    // ========================================================================
    // Anthropic Models
    // ========================================================================
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-haiku-20241022': 200000,

    // ========================================================================
    // Google Gemini Models
    // ========================================================================
    'gemini-pro': 32768,
    'gemini-pro-vision': 16384,
    'gemini-1.5-pro': 1048576,      // 1M tokens
    'gemini-1.5-flash': 1048576,    // 1M tokens
    'gemini-ultra': 32768,

    // ========================================================================
    // Local/Ollama Models (approximate limits)
    // ========================================================================
    'llama2': 4096,
    'llama2:13b': 4096,
    'llama2:70b': 4096,
    'llama3': 8192,
    'llama3:70b': 8192,
    'mistral': 8192,
    'mistral:7b': 8192,
    'mixtral': 32768,
    'codellama': 16384,
    'phi': 2048,
    'phi3': 4096,
    'gemma': 8192,
    'qwen': 32768,
    'deepseek': 16384,

    // ========================================================================
    // Speech-to-Text Models
    // ========================================================================
    'whisper-1': 25 * 60 * 16000,   // ~25 minutes of audio (samples, not tokens)
    'gpt-4o-mini-transcribe': 128000
};

/**
 * Default output token limits for models
 * Some models have different limits for input vs output
 */
const MODEL_OUTPUT_LIMITS = {
    'gpt-4o': 16384,
    'gpt-4o-mini': 16384,
    'gpt-4-turbo': 4096,
    'gpt-4': 4096,
    'gpt-3.5-turbo': 4096,
    'claude-3-opus-20240229': 4096,
    'claude-3-sonnet-20240229': 4096,
    'claude-3-haiku-20240307': 4096,
    'claude-3-5-sonnet-20241022': 8192,
    'gemini-pro': 8192,
    'gemini-1.5-pro': 8192,
    'gemini-1.5-flash': 8192
};

/**
 * Default token limit if model is not found
 */
const DEFAULT_TOKEN_LIMIT = 4096;

/**
 * Default output token limit if model is not found
 */
const DEFAULT_OUTPUT_LIMIT = 2048;

/**
 * Get the context window (input) token limit for a model
 * @param {string} model - Model name or identifier
 * @returns {number} Token limit
 */
function getTokenLimit(model) {
    if (!model) return DEFAULT_TOKEN_LIMIT;

    // Normalize model name (lowercase, handle aliases)
    const normalizedModel = normalizeModelName(model);

    return MODEL_TOKEN_LIMITS[normalizedModel] || DEFAULT_TOKEN_LIMIT;
}

/**
 * Get the output token limit for a model
 * @param {string} model - Model name or identifier
 * @returns {number} Output token limit
 */
function getOutputLimit(model) {
    if (!model) return DEFAULT_OUTPUT_LIMIT;

    const normalizedModel = normalizeModelName(model);

    return MODEL_OUTPUT_LIMITS[normalizedModel] ||
           Math.min(MODEL_TOKEN_LIMITS[normalizedModel] || DEFAULT_TOKEN_LIMIT, DEFAULT_OUTPUT_LIMIT * 2);
}

/**
 * Normalize model name for lookup
 * Handles various naming conventions and aliases
 * @param {string} model - Model name
 * @returns {string} Normalized model name
 */
function normalizeModelName(model) {
    const modelLower = model.toLowerCase().trim();

    // Handle common aliases
    const aliases = {
        'gpt-4-turbo-2024-04-09': 'gpt-4-turbo',
        'gpt-4-0125-preview': 'gpt-4-turbo-preview',
        'gpt-4-1106-preview': 'gpt-4-turbo-preview',
        'gpt-3.5-turbo-0125': 'gpt-3.5-turbo',
        'gpt-3.5-turbo-1106': 'gpt-3.5-turbo',
        'claude-3-opus': 'claude-3-opus-20240229',
        'claude-3-sonnet': 'claude-3-sonnet-20240229',
        'claude-3-haiku': 'claude-3-haiku-20240307',
        'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
        'claude-sonnet-3.5': 'claude-3-5-sonnet-20241022',
        'gemini-1.5-pro-latest': 'gemini-1.5-pro',
        'gemini-1.5-flash-latest': 'gemini-1.5-flash'
    };

    return aliases[modelLower] || modelLower;
}

/**
 * Check if a model supports a given number of tokens
 * @param {string} model - Model name
 * @param {number} tokenCount - Number of tokens to check
 * @returns {boolean} True if model supports the token count
 */
function supportsTokenCount(model, tokenCount) {
    return tokenCount <= getTokenLimit(model);
}

/**
 * Get the recommended max tokens for a response based on model and input size
 * @param {string} model - Model name
 * @param {number} inputTokens - Number of input tokens
 * @returns {number} Recommended max tokens for response
 */
function getRecommendedMaxTokens(model, inputTokens = 0) {
    const contextLimit = getTokenLimit(model);
    const outputLimit = getOutputLimit(model);

    // Leave room for the response, don't exceed output limit
    const availableTokens = contextLimit - inputTokens;
    return Math.min(availableTokens, outputLimit);
}

/**
 * Get all available models
 * @returns {string[]} Array of model names
 */
function getAvailableModels() {
    return Object.keys(MODEL_TOKEN_LIMITS);
}

/**
 * Get models by provider
 * @param {string} provider - Provider name (openai, anthropic, google, ollama)
 * @returns {string[]} Array of model names for that provider
 */
function getModelsByProvider(provider) {
    const providerPrefixes = {
        openai: ['gpt-'],
        anthropic: ['claude-'],
        google: ['gemini-'],
        ollama: ['llama', 'mistral', 'mixtral', 'codellama', 'phi', 'gemma', 'qwen', 'deepseek']
    };

    const prefixes = providerPrefixes[provider.toLowerCase()];
    if (!prefixes) return [];

    return Object.keys(MODEL_TOKEN_LIMITS).filter(model =>
        prefixes.some(prefix => model.toLowerCase().startsWith(prefix))
    );
}

module.exports = {
    MODEL_TOKEN_LIMITS,
    MODEL_OUTPUT_LIMITS,
    DEFAULT_TOKEN_LIMIT,
    DEFAULT_OUTPUT_LIMIT,
    getTokenLimit,
    getOutputLimit,
    normalizeModelName,
    supportsTokenCount,
    getRecommendedMaxTokens,
    getAvailableModels,
    getModelsByProvider
};
