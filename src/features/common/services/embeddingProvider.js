/**
 * Embedding Provider - Phase 4
 *
 * Handles text embedding generation for semantic search.
 * Supports multiple providers: Mock (for testing), OpenAI, and Local models.
 */

/**
 * Mock Embedding Provider
 * Generates simple hash-based embeddings for testing without external APIs
 */
class MockEmbeddingProvider {
    constructor() {
        this.dimensions = 384; // Standard embedding dimension
        console.log('[MockEmbeddingProvider] Initialized (for testing only)');
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
}

/**
 * OpenAI Embedding Provider
 * Uses OpenAI's text-embedding-3-small model
 */
class OpenAIEmbeddingProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = 'text-embedding-3-small';
        this.dimensions = 1536;
        console.log('[OpenAIEmbeddingProvider] Initialized');
    }

    async generateEmbedding(text) {
        if (!text || text.length === 0) {
            return Array(this.dimensions).fill(0);
        }

        try {
            // Dynamic import to avoid requiring OpenAI if not used
            const { OpenAI } = require('openai');
            const openai = new OpenAI({ apiKey: this.apiKey });

            const response = await openai.embeddings.create({
                model: this.model,
                input: text
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('[OpenAIEmbeddingProvider] Error generating embedding:', error);

            // Fallback to mock if OpenAI fails
            console.warn('[OpenAIEmbeddingProvider] Falling back to mock embeddings');
            const mockProvider = new MockEmbeddingProvider();
            return await mockProvider.generateEmbedding(text);
        }
    }

    getName() {
        return 'openai';
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
    EmbeddingProviderFactory
};
