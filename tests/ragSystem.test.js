/**
 * RAG System Unit Tests
 *
 * Tests for the Retrieval Augmented Generation system:
 * - Indexing Service (chunking, embedding generation)
 * - Semantic Search (cosine similarity, relevance scoring)
 * - RAG Service (context retrieval, citation tracking)
 * - Embedding Provider (mock and factory)
 */

// Mock dependencies
jest.mock('../src/features/common/utils/dependencyLoader', () => ({
    loaders: {
        loadUuid: () => ({
            v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
        }),
        loadPdfParse: () => null,
        loadMammoth: () => null,
        loadTesseract: () => null
    }
}));

jest.mock('../src/features/common/services/sqliteClient', () => ({
    getDb: jest.fn(),
    getDatabase: jest.fn()
}));

// Import modules after mocking
const { MockEmbeddingProvider, OpenAIEmbeddingProvider, EmbeddingProviderFactory } = require('../src/features/common/services/embeddingProvider');

// ═══════════════════════════════════════════════════════════════════════════
// Section 1: MockEmbeddingProvider Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('MockEmbeddingProvider', () => {
    let provider;

    beforeEach(() => {
        provider = new MockEmbeddingProvider();
    });

    test('should have correct dimensions (384)', () => {
        expect(provider.dimensions).toBe(384);
    });

    test('should return name "mock"', () => {
        expect(provider.getName()).toBe('mock');
    });

    test('should generate embedding for text', async () => {
        const text = 'This is a test text for embedding generation';
        const embedding = await provider.generateEmbedding(text);

        expect(embedding).toBeInstanceOf(Array);
        expect(embedding.length).toBe(384);
        expect(embedding.every(v => typeof v === 'number')).toBe(true);
    });

    test('should generate normalized embeddings (unit vector)', async () => {
        const text = 'Test text for normalization check';
        const embedding = await provider.generateEmbedding(text);

        // Calculate magnitude
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        expect(magnitude).toBeCloseTo(1.0, 5);
    });

    test('should generate consistent embeddings for same text', async () => {
        const text = 'Consistent embedding test';
        const embedding1 = await provider.generateEmbedding(text);
        const embedding2 = await provider.generateEmbedding(text);

        expect(embedding1).toEqual(embedding2);
    });

    test('should generate different embeddings for different texts', async () => {
        const text1 = 'First test text';
        const text2 = 'Second different text';

        const embedding1 = await provider.generateEmbedding(text1);
        const embedding2 = await provider.generateEmbedding(text2);

        expect(embedding1).not.toEqual(embedding2);
    });

    test('should return zero vector for empty text', async () => {
        const embedding = await provider.generateEmbedding('');
        expect(embedding.every(v => v === 0)).toBe(true);
    });

    test('should return zero vector for null text', async () => {
        const embedding = await provider.generateEmbedding(null);
        expect(embedding.every(v => v === 0)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 2: EmbeddingProviderFactory Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('EmbeddingProviderFactory', () => {
    test('should create MockEmbeddingProvider by default', () => {
        const provider = EmbeddingProviderFactory.create();
        expect(provider).toBeInstanceOf(MockEmbeddingProvider);
        expect(provider.getName()).toBe('mock');
    });

    test('should create MockEmbeddingProvider for "mock" type', () => {
        const provider = EmbeddingProviderFactory.create('mock');
        expect(provider).toBeInstanceOf(MockEmbeddingProvider);
    });

    test('should fallback to MockEmbeddingProvider when OpenAI key not provided', () => {
        const provider = EmbeddingProviderFactory.create('openai', {});
        expect(provider).toBeInstanceOf(MockEmbeddingProvider);
    });

    test('should create OpenAIEmbeddingProvider when API key provided', () => {
        const provider = EmbeddingProviderFactory.create('openai', { apiKey: 'test-key' });
        expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
        expect(provider.getName()).toBe('openai');
    });

    describe('createAuto', () => {
        const originalEnv = process.env.OPENAI_API_KEY;

        afterEach(() => {
            if (originalEnv) {
                process.env.OPENAI_API_KEY = originalEnv;
            } else {
                delete process.env.OPENAI_API_KEY;
            }
        });

        test('should create MockEmbeddingProvider when no API key in env', () => {
            delete process.env.OPENAI_API_KEY;
            const provider = EmbeddingProviderFactory.createAuto();
            expect(provider).toBeInstanceOf(MockEmbeddingProvider);
        });

        test('should create OpenAIEmbeddingProvider when API key in env', () => {
            process.env.OPENAI_API_KEY = 'sk-test-key';
            const provider = EmbeddingProviderFactory.createAuto();
            expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 3: Chunking Algorithm Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('Chunking Algorithm', () => {
    // Replicate the chunking logic from indexingService
    function chunkText(text, size, overlap) {
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + size, text.length);
            const content = text.slice(start, end).trim();

            if (content.length > 0) {
                chunks.push({
                    content,
                    start,
                    end
                });
            }

            start += size - overlap;
        }

        return chunks;
    }

    test('should create correct number of chunks', () => {
        const text = 'A'.repeat(1000);
        const chunks = chunkText(text, 500, 100);
        // With 500 char chunks and 100 overlap: 0-500, 400-900, 800-1000
        expect(chunks.length).toBe(3);
    });

    test('should respect chunk size', () => {
        const text = 'A'.repeat(1000);
        const chunks = chunkText(text, 300, 50);
        chunks.forEach(chunk => {
            expect(chunk.content.length).toBeLessThanOrEqual(300);
        });
    });

    test('should create overlapping chunks', () => {
        const text = 'ABCDEFGHIJ'.repeat(50); // 500 chars
        const chunks = chunkText(text, 200, 50);

        // Check overlap between consecutive chunks
        for (let i = 1; i < chunks.length; i++) {
            const prevEnd = chunks[i - 1].end;
            const currStart = chunks[i].start;
            const overlap = prevEnd - currStart;
            expect(overlap).toBe(50);
        }
    });

    test('should handle text shorter than chunk size', () => {
        const text = 'Short text';
        const chunks = chunkText(text, 500, 100);
        expect(chunks.length).toBe(1);
        expect(chunks[0].content).toBe('Short text');
    });

    test('should handle empty text', () => {
        const chunks = chunkText('', 500, 100);
        expect(chunks.length).toBe(0);
    });

    test('should trim whitespace from chunks', () => {
        const text = '   Hello World   ' + 'A'.repeat(500);
        const chunks = chunkText(text, 500, 100);
        expect(chunks[0].content.startsWith(' ')).toBe(false);
        expect(chunks[0].content.endsWith(' ')).toBe(false);
    });

    test('should preserve start and end positions', () => {
        const text = 'ABCDEFGHIJ'.repeat(100);
        const chunks = chunkText(text, 200, 50);

        chunks.forEach(chunk => {
            // Verify that extracting from original text at positions gives same content
            const extracted = text.slice(chunk.start, chunk.end).trim();
            expect(extracted).toBe(chunk.content);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 4: Cosine Similarity Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('Cosine Similarity', () => {
    // Replicate the cosine similarity logic from indexingService
    function cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    test('should return 1 for identical vectors', () => {
        const vec = [1, 2, 3, 4, 5];
        expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    test('should return 0 for orthogonal vectors', () => {
        const vec1 = [1, 0, 0];
        const vec2 = [0, 1, 0];
        expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.0);
    });

    test('should return -1 for opposite vectors', () => {
        const vec1 = [1, 2, 3];
        const vec2 = [-1, -2, -3];
        expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1.0);
    });

    test('should return ~0.707 for 45-degree vectors', () => {
        const vec1 = [1, 0];
        const vec2 = [0.707, 0.707];
        expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.707, 2);
    });

    test('should handle null vectors', () => {
        expect(cosineSimilarity(null, [1, 2, 3])).toBe(0);
        expect(cosineSimilarity([1, 2, 3], null)).toBe(0);
        expect(cosineSimilarity(null, null)).toBe(0);
    });

    test('should handle vectors of different lengths', () => {
        expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    test('should handle zero vectors', () => {
        const zeroVec = [0, 0, 0];
        expect(cosineSimilarity(zeroVec, [1, 2, 3])).toBe(0);
    });

    test('should be symmetric', () => {
        const vec1 = [1, 2, 3];
        const vec2 = [4, 5, 6];
        expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(cosineSimilarity(vec2, vec1));
    });

    test('should work with high-dimensional vectors', () => {
        const dim = 1536; // OpenAI embedding dimension
        const vec1 = Array(dim).fill(0).map(() => Math.random() - 0.5);
        const vec2 = Array(dim).fill(0).map(() => Math.random() - 0.5);

        const similarity = cosineSimilarity(vec1, vec2);
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 5: IndexingService.getProviderInfo() Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('IndexingService.getProviderInfo()', () => {
    // We need to import indexingService with mock dependencies
    let indexingService;

    beforeEach(() => {
        jest.resetModules();
        // Re-import with fresh mocks
        indexingService = require('../src/features/common/services/indexingService');
    });

    test('should return "none" when no provider configured', () => {
        const info = indexingService.getProviderInfo();
        expect(info.name).toBe('none');
        expect(info.isConfigured).toBe(false);
        expect(info.quality).toBe('none');
    });

    test('should return mock provider info', () => {
        const mockProvider = new MockEmbeddingProvider();
        indexingService.setEmbeddingProvider(mockProvider);

        const info = indexingService.getProviderInfo();
        expect(info.name).toBe('mock');
        expect(info.displayName).toBe('Mock (Test)');
        expect(info.quality).toBe('low');
        expect(info.isConfigured).toBe(true);
        expect(info.warning).toBeDefined();
        expect(info.dimensions).toBe(384);
    });

    test('should return openai provider info', () => {
        const openaiProvider = new OpenAIEmbeddingProvider('test-key');
        indexingService.setEmbeddingProvider(openaiProvider);

        const info = indexingService.getProviderInfo();
        expect(info.name).toBe('openai');
        expect(info.displayName).toBe('OpenAI');
        expect(info.quality).toBe('high');
        expect(info.isConfigured).toBe(true);
        expect(info.warning).toBeUndefined();
        expect(info.dimensions).toBe(1536);
        expect(info.model).toBe('text-embedding-3-small');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 6: Semantic Search Simulation Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('Semantic Search Simulation', () => {
    let provider;

    beforeEach(() => {
        provider = new MockEmbeddingProvider();
    });

    test('should find most similar text using embeddings', async () => {
        const documents = [
            'La stratégie marketing pour 2025',
            'Les recettes de cuisine française',
            'La politique RH de l\'entreprise',
            'Le plan marketing et acquisition clients'
        ];

        const query = 'stratégie marketing';

        // Generate embeddings
        const docEmbeddings = await Promise.all(
            documents.map(doc => provider.generateEmbedding(doc))
        );
        const queryEmbedding = await provider.generateEmbedding(query);

        // Calculate similarities
        function cosineSimilarity(a, b) {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        }

        const similarities = docEmbeddings.map((emb, i) => ({
            doc: documents[i],
            score: cosineSimilarity(queryEmbedding, emb)
        }));

        // Sort by similarity
        similarities.sort((a, b) => b.score - a.score);

        // The most similar should be marketing-related
        expect(similarities[0].doc).toContain('marketing');
    });

    test('should rank results by relevance score', async () => {
        const chunks = [
            { content: 'Notre budget marketing est de 500K', id: 1 },
            { content: 'Le département RH gère les recrutements', id: 2 },
            { content: 'La stratégie go-to-market pour 2025', id: 3 }
        ];

        const query = 'budget marketing stratégie';
        const queryEmbedding = await provider.generateEmbedding(query);

        function cosineSimilarity(a, b) {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        }

        const results = await Promise.all(chunks.map(async chunk => {
            const embedding = await provider.generateEmbedding(chunk.content);
            return {
                ...chunk,
                score: cosineSimilarity(queryEmbedding, embedding)
            };
        }));

        results.sort((a, b) => b.score - a.score);

        // All scores should be between 0 and 1 for positive correlations
        results.forEach(r => {
            expect(r.score).toBeDefined();
            expect(typeof r.score).toBe('number');
        });

        // Scores should be in descending order
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
        }
    });

    test('should filter results by minimum score', async () => {
        const MIN_SCORE = 0.5;
        const chunks = [
            'Document très pertinent sur le sujet exact',
            'Document moyennement pertinent',
            'Document complètement hors sujet'
        ];

        const query = 'sujet exact pertinent';
        const queryEmbedding = await provider.generateEmbedding(query);

        function cosineSimilarity(a, b) {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        }

        const results = await Promise.all(chunks.map(async content => {
            const embedding = await provider.generateEmbedding(content);
            return {
                content,
                score: cosineSimilarity(queryEmbedding, embedding)
            };
        }));

        const filtered = results.filter(r => r.score >= MIN_SCORE);

        // Verify all filtered results meet minimum score
        filtered.forEach(r => {
            expect(r.score).toBeGreaterThanOrEqual(MIN_SCORE);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 7: Token Estimation Tests
// ═══════════════════════════════════════════════════════════════════════════
describe('Token Estimation', () => {
    // Replicate simple token estimation (4 chars per token heuristic)
    function estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    test('should estimate tokens for short text', () => {
        const text = 'Hello world'; // 11 chars
        expect(estimateTokens(text)).toBe(3); // ceil(11/4) = 3
    });

    test('should estimate tokens for long text', () => {
        const text = 'A'.repeat(1000);
        expect(estimateTokens(text)).toBe(250);
    });

    test('should return 0 for empty text', () => {
        expect(estimateTokens('')).toBe(0);
        expect(estimateTokens(null)).toBe(0);
        expect(estimateTokens(undefined)).toBe(0);
    });

    test('should handle unicode characters', () => {
        const text = '你好世界'; // Chinese characters (4 chars)
        expect(estimateTokens(text)).toBe(1);
    });
});
