/**
 * Embedding Provider - Phase 4
 *
 * Handles text embedding generation for semantic search.
 * Supports multiple providers: Mock (for testing), OpenAI, and Local models.
 *
 * KB-P0-1: Added fallback tracking and notification system
 */

const { EventEmitter } = require('events');

// Global event emitter for embedding provider status changes
const embeddingEvents = new EventEmitter();

// Track current provider status
let currentProviderStatus = {
    provider: 'unknown',
    isUsingFallback: false,
    lastFallbackReason: null,
    lastFallbackTime: null
};

/**
 * Get current provider status
 * @returns {Object} Current provider status including fallback state
 */
function getProviderStatus() {
    return { ...currentProviderStatus };
}

/**
 * Mock Embedding Provider
 * Generates simple hash-based embeddings for testing without external APIs
 * WARNING: Mock embeddings provide basic keyword matching only, not true semantic search
 */
class MockEmbeddingProvider {
    constructor(isFallback = false) {
        this.dimensions = 384; // Standard embedding dimension
        this.isFallback = isFallback;

        if (isFallback) {
            console.warn('[MockEmbeddingProvider] ⚠️ ATTENTION: Mode dégradé activé - Recherche sémantique limitée');
        } else {
            console.log('[MockEmbeddingProvider] Initialized (for testing only)');
        }
    }

    /**
     * Generate mock embedding from text
     * Uses a simple hash-based approach for consistent results
     */
    async generateEmbedding(text) {
        if (!text || text.length === 0) {
            return Array(this.dimensions).fill(0);
        }

        // Generate deterministic "embedding" based on text content
        const embedding = new Array(this.dimensions);

        // Use character codes to create pseudo-random but consistent values
        for (let i = 0; i < this.dimensions; i++) {
            let value = 0;
            for (let j = 0; j < text.length; j++) {
                value += text.charCodeAt(j) * (i + 1) * (j + 1);
            }
            // Normalize to [-1, 1]
            embedding[i] = (value % 2000 - 1000) / 1000;
        }

        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < this.dimensions; i++) {
                embedding[i] /= magnitude;
            }
        }

        return embedding;
    }

    getName() {
        return 'mock';
    }

    /**
     * KB-P0-1: Return metadata about embedding generation
     */
    getStatus() {
        return {
            provider: 'mock',
            isFallback: this.isFallback,
            quality: 'basic', // Mock provides basic keyword matching only
            warning: this.isFallback
                ? 'Mode dégradé: La recherche sémantique est limitée. Vérifiez votre clé API OpenAI.'
                : null
        };
    }
}

/**
 * OpenAI Embedding Provider
 * Uses OpenAI's text-embedding-3-small model
 *
 * KB-P2-2: Added rate limiting to prevent API quota exhaustion
 */
class OpenAIEmbeddingProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = 'text-embedding-3-small';
        this.dimensions = 1536;
        this.fallbackActive = false;
        this.consecutiveFailures = 0;

        // KB-P2-2: Rate limiting configuration (token bucket algorithm)
        this.rateLimiter = {
            maxTokens: 60,           // Max requests per window
            tokens: 60,              // Current available tokens
            refillRate: 60,          // Tokens added per second
            lastRefill: Date.now(),  // Last refill timestamp
            windowMs: 60000,         // 60 second window
            queue: [],               // Pending requests queue
            processing: false        // Queue processing flag
        };

        // KB-P0-1: Update global status
        currentProviderStatus.provider = 'openai';
        currentProviderStatus.isUsingFallback = false;

        console.log('[OpenAIEmbeddingProvider] Initialized with rate limiting (60 req/min)');
    }

    /**
     * KB-P2-2: Token bucket rate limiter
     * Ensures we don't exceed OpenAI rate limits
     */
    async _acquireToken() {
        // Refill tokens based on elapsed time
        const now = Date.now();
        const elapsed = now - this.rateLimiter.lastRefill;
        const tokensToAdd = Math.floor(elapsed / 1000) * this.rateLimiter.refillRate / 60;

        if (tokensToAdd > 0) {
            this.rateLimiter.tokens = Math.min(
                this.rateLimiter.maxTokens,
                this.rateLimiter.tokens + tokensToAdd
            );
            this.rateLimiter.lastRefill = now;
        }

        // If we have tokens, consume one immediately
        if (this.rateLimiter.tokens >= 1) {
            this.rateLimiter.tokens--;
            return true;
        }

        // Otherwise, wait until we can get a token
        const waitTime = Math.ceil((1 - this.rateLimiter.tokens) * (60000 / this.rateLimiter.refillRate));
        console.log(`[OpenAIEmbeddingProvider] Rate limit: waiting ${waitTime}ms for token`);

        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Refill and consume after waiting
        this.rateLimiter.tokens = 1;
        this.rateLimiter.tokens--;
        this.rateLimiter.lastRefill = Date.now();

        return true;
    }

    async generateEmbedding(text) {
        if (!text || text.length === 0) {
            return Array(this.dimensions).fill(0);
        }

        // KB-P2-2: Acquire rate limit token before API call
        await this._acquireToken();

        try {
            // Dynamic import to avoid requiring OpenAI if not used
            const { OpenAI } = require('openai');
            const openai = new OpenAI({ apiKey: this.apiKey });

            const response = await openai.embeddings.create({
                model: this.model,
                input: text
            });

            // KB-P0-1: Reset failure counter on success
            if (this.fallbackActive) {
                console.log('[OpenAIEmbeddingProvider] ✅ Connexion rétablie - Recherche sémantique optimale');
                this.fallbackActive = false;
                currentProviderStatus.isUsingFallback = false;
                embeddingEvents.emit('provider-restored', { provider: 'openai' });
            }
            this.consecutiveFailures = 0;

            return response.data[0].embedding;
        } catch (error) {
            console.error('[OpenAIEmbeddingProvider] Error generating embedding:', error);

            // KB-P0-1: Track fallback activation with detailed logging
            this.consecutiveFailures++;
            const errorMessage = error.message || 'Unknown error';
            const errorType = this._classifyError(error);

            if (!this.fallbackActive) {
                this.fallbackActive = true;
                currentProviderStatus.isUsingFallback = true;
                currentProviderStatus.lastFallbackReason = errorMessage;
                currentProviderStatus.lastFallbackTime = Date.now();

                console.warn('╔══════════════════════════════════════════════════════════════╗');
                console.warn('║  ⚠️  ALERTE: Basculement vers embeddings de secours            ║');
                console.warn('╠══════════════════════════════════════════════════════════════╣');
                console.warn(`║  Raison: ${errorType.padEnd(50)}║`);
                console.warn('║  Impact: Recherche sémantique dégradée                       ║');
                console.warn('║  Action: Vérifiez votre clé API OpenAI et la connexion       ║');
                console.warn('╚══════════════════════════════════════════════════════════════╝');

                // KB-P0-1: Emit event for UI notification
                embeddingEvents.emit('fallback-activated', {
                    provider: 'openai',
                    reason: errorType,
                    message: errorMessage,
                    timestamp: Date.now()
                });
            }

            // Fallback to mock if OpenAI fails
            const mockProvider = new MockEmbeddingProvider(true); // Mark as fallback
            return await mockProvider.generateEmbedding(text);
        }
    }

    /**
     * KB-P0-1: Classify error type for better user messaging
     */
    _classifyError(error) {
        const message = (error.message || '').toLowerCase();
        const code = error.code || error.status || '';

        if (message.includes('api key') || message.includes('apikey') || code === 401) {
            return 'Clé API invalide ou manquante';
        }
        if (message.includes('rate limit') || code === 429) {
            return 'Limite de requêtes atteinte';
        }
        if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
            return 'Erreur réseau - Vérifiez votre connexion';
        }
        if (message.includes('timeout')) {
            return 'Délai d\'attente dépassé';
        }
        if (code === 500 || code === 502 || code === 503) {
            return 'Service OpenAI temporairement indisponible';
        }
        return 'Erreur inattendue';
    }

    getName() {
        return this.fallbackActive ? 'openai-fallback' : 'openai';
    }

    /**
     * KB-P0-1: Return metadata about embedding generation
     */
    getStatus() {
        return {
            provider: 'openai',
            isFallback: this.fallbackActive,
            quality: this.fallbackActive ? 'basic' : 'semantic',
            consecutiveFailures: this.consecutiveFailures,
            warning: this.fallbackActive
                ? currentProviderStatus.lastFallbackReason
                : null
        };
    }
}

/**
 * Embedding Provider Factory
 * Creates the appropriate provider based on configuration
 */
class EmbeddingProviderFactory {
    /**
     * Create an embedding provider
     * @param {string} type - Provider type: 'mock', 'openai'
     * @param {Object} config - Provider configuration
     * @returns {Object} Embedding provider instance
     */
    static create(type = 'mock', config = {}) {
        switch (type) {
            case 'openai':
                if (!config.apiKey) {
                    console.warn('[EmbeddingProviderFactory] OpenAI API key not provided, using mock');
                    return new MockEmbeddingProvider();
                }
                return new OpenAIEmbeddingProvider(config.apiKey);

            case 'mock':
            default:
                return new MockEmbeddingProvider();
        }
    }

    /**
     * Auto-detect and create best available provider
     * Checks for API keys in environment and returns appropriate provider
     */
    static createAuto() {
        // Check for OpenAI API key in environment
        const openaiKey = process.env.OPENAI_API_KEY;

        if (openaiKey && openaiKey.length > 0) {
            console.log('[EmbeddingProviderFactory] OpenAI API key found, using OpenAI provider');
            return new OpenAIEmbeddingProvider(openaiKey);
        }

        // Default to mock
        console.log('[EmbeddingProviderFactory] No API key found, using mock provider');
        return new MockEmbeddingProvider();
    }
}

module.exports = {
    MockEmbeddingProvider,
    OpenAIEmbeddingProvider,
    EmbeddingProviderFactory,
    // KB-P0-1: Export status and event system for UI notifications
    embeddingEvents,
    getProviderStatus
};
