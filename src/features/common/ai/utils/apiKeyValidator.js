/**
 * API Key Validator Utility
 * Centralized API key validation to eliminate code duplication across providers
 *
 * Previously duplicated across 6 provider files with similar patterns.
 */

/**
 * Provider configurations for API key validation
 */
const PROVIDER_CONFIGS = {
    openai: {
        name: 'OpenAI',
        prefix: 'sk-',
        endpoint: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: (key) => ({
            'Authorization': `Bearer ${key}`
        }),
        validateFormat: (key) => key.startsWith('sk-'),
        // 200 = valid
        isValidResponse: (status) => status === 200
    },
    anthropic: {
        name: 'Anthropic',
        prefix: 'sk-ant-',
        endpoint: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: (key) => ({
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        }),
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        }),
        validateFormat: (key) => key.startsWith('sk-ant-'),
        // 200 or 400 (bad request but valid key)
        isValidResponse: (status) => status === 200 || status === 400
    },
    gemini: {
        name: 'Gemini',
        prefix: null, // No specific prefix
        endpoint: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        method: 'GET',
        headers: () => ({}),
        validateFormat: () => true, // No specific format validation
        isValidResponse: (status) => status === 200
    },
    deepgram: {
        name: 'Deepgram',
        prefix: null,
        endpoint: 'https://api.deepgram.com/v1/projects',
        method: 'GET',
        headers: (key) => ({
            'Authorization': `Token ${key}`
        }),
        validateFormat: () => true,
        isValidResponse: (status) => status === 200
    },
    whisper: {
        name: 'Whisper (OpenAI)',
        prefix: 'sk-',
        endpoint: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: (key) => ({
            'Authorization': `Bearer ${key}`
        }),
        validateFormat: (key) => key.startsWith('sk-'),
        isValidResponse: (status) => status === 200
    },
    ollama: {
        name: 'Ollama',
        prefix: null,
        endpoint: 'http://localhost:11434/api/tags',
        method: 'GET',
        headers: () => ({}),
        validateFormat: () => true,
        // Ollama doesn't require API key, just check if server is running
        isValidResponse: (status) => status === 200,
        isLocal: true
    }
};

/**
 * Validate an API key for a specific provider
 * @param {string} key - The API key to validate
 * @param {string} provider - Provider name: 'openai', 'anthropic', 'gemini', 'deepgram', 'whisper', 'ollama'
 * @param {Object} options - Optional overrides
 * @param {number} options.timeout - Request timeout in ms (default: 10000)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function validateApiKey(key, provider, options = {}) {
    const config = PROVIDER_CONFIGS[provider.toLowerCase()];

    if (!config) {
        return { success: false, error: `Unknown provider: ${provider}` };
    }

    // Skip key validation for local providers like Ollama
    if (config.isLocal) {
        return validateLocalProvider(config, options);
    }

    // Basic format validation
    if (!key || typeof key !== 'string') {
        return { success: false, error: `Invalid ${config.name} API key format.` };
    }

    // Provider-specific format validation
    if (config.validateFormat && !config.validateFormat(key)) {
        return {
            success: false,
            error: `Invalid ${config.name} API key format.${config.prefix ? ` Expected prefix: ${config.prefix}` : ''}`
        };
    }

    try {
        const endpoint = typeof config.endpoint === 'function'
            ? config.endpoint(key)
            : config.endpoint;

        const fetchOptions = {
            method: config.method,
            headers: config.headers(key)
        };

        if (config.body) {
            fetchOptions.body = config.body;
        }

        // Add timeout using AbortController
        const controller = new AbortController();
        const timeout = options.timeout || 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(endpoint, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (config.isValidResponse(response.status)) {
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.error?.message ||
                               errorData.message ||
                               `Validation failed with status: ${response.status}`;
                return { success: false, error: message };
            }
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`[${config.name}] Validation timeout`);
            return { success: false, error: 'Validation request timed out.' };
        }
        console.error(`[${config.name}] Network error during key validation:`, error.message);
        return { success: false, error: 'A network error occurred during validation.' };
    }
}

/**
 * Validate a local provider (like Ollama) by checking if the server is running
 * @param {Object} config - Provider configuration
 * @param {Object} options - Options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function validateLocalProvider(config, options = {}) {
    try {
        const controller = new AbortController();
        const timeout = options.timeout || 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(config.endpoint, {
                method: config.method,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (config.isValidResponse(response.status)) {
                return { success: true };
            } else {
                return { success: false, error: `${config.name} server responded with status: ${response.status}` };
            }
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: `${config.name} server connection timed out.` };
        }
        return { success: false, error: `${config.name} server is not running or not accessible.` };
    }
}

/**
 * Validate multiple API keys at once
 * @param {Object} keys - Object with provider names as keys and API keys as values
 * @returns {Promise<Object>} Results for each provider
 */
async function validateMultipleKeys(keys) {
    const results = {};
    const validations = Object.entries(keys).map(async ([provider, key]) => {
        results[provider] = await validateApiKey(key, provider);
    });
    await Promise.all(validations);
    return results;
}

/**
 * Get the expected format description for a provider's API key
 * @param {string} provider - Provider name
 * @returns {string} Format description
 */
function getKeyFormatDescription(provider) {
    const config = PROVIDER_CONFIGS[provider.toLowerCase()];
    if (!config) return 'Unknown provider';

    if (config.isLocal) {
        return `${config.name} does not require an API key`;
    }

    if (config.prefix) {
        return `${config.name} API key should start with "${config.prefix}"`;
    }

    return `${config.name} API key (no specific format required)`;
}

module.exports = {
    validateApiKey,
    validateMultipleKeys,
    getKeyFormatDescription,
    PROVIDER_CONFIGS
};
