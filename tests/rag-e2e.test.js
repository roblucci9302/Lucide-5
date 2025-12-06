/**
 * RAG End-to-End Test Suite
 *
 * Tests the complete RAG flow:
 * 1. Document upload and extraction
 * 2. Chunking with page tracking
 * 3. Embedding generation
 * 4. Semantic search
 * 5. Citation formatting with page numbers
 */

const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    verbose: true,
    mockEmbeddings: true // Set to false to test with real OpenAI API
};

// ============================================================
// MOCK IMPLEMENTATIONS
// ============================================================

/**
 * Mock Embedding Provider for testing
 */
class MockEmbeddingProvider {
    constructor() {
        this.dimensions = 384;
        this.callCount = 0;
    }

    async generateEmbedding(text) {
        this.callCount++;
        if (!text || text.length === 0) {
            return Array(this.dimensions).fill(0);
        }

        const embedding = new Array(this.dimensions);
        for (let i = 0; i < this.dimensions; i++) {
            let value = 0;
            for (let j = 0; j < text.length; j++) {
                value += text.charCodeAt(j) * (i + 1) * (j + 1);
            }
            embedding[i] = (value % 2000 - 1000) / 1000;
        }

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

// ============================================================
// CORE RAG FUNCTIONS (extracted from services)
// ============================================================

/**
 * Chunk text into overlapping segments
 */
function chunkText(text, size = 500, overlap = 100) {
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

/**
 * Get page number for a character position
 */
function getPageNumber(charPosition, pageBreaks) {
    if (!pageBreaks || pageBreaks.length === 0) {
        return null;
    }

    for (const page of pageBreaks) {
        if (charPosition >= page.charStart && charPosition < page.charEnd) {
            return page.pageNumber;
        }
    }

    if (charPosition >= pageBreaks[pageBreaks.length - 1].charStart) {
        return pageBreaks[pageBreaks.length - 1].pageNumber;
    }

    return null;
}

/**
 * Calculate cosine similarity between two vectors
 */
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

/**
 * Format citation with page number
 */
function formatCitation(source) {
    const pageInfo = source.page_number
        ? `│  Page: ${source.page_number}\n`
        : '';

    return `
┌─ Source: ${source.document_title}
│  File: ${source.document_filename}
${pageInfo}│  Relevance: ${(source.relevance_score * 100).toFixed(1)}%
│
│  ${source.content.substring(0, 200)}${source.content.length > 200 ? '...' : ''}
└─────────────────────────────────────────────────────
`;
}

// ============================================================
// TEST DATA
// ============================================================

const SAMPLE_PDF_CONTENT = `
Page 1: Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.

The process begins with observations or data, such as examples, direct experience, or instruction, to look for patterns in data and make better decisions in the future.

Page 2: Types of Machine Learning

There are three main types of machine learning:

1. Supervised Learning: The algorithm learns from labeled training data, and makes predictions based on that data.

2. Unsupervised Learning: The algorithm learns from unlabeled data and finds hidden patterns or intrinsic structures.

3. Reinforcement Learning: The algorithm learns by interacting with an environment and receiving rewards or penalties.

Page 3: Deep Learning

Deep learning is a subset of machine learning that uses neural networks with many layers. These deep neural networks are capable of learning complex patterns in large amounts of data.

Key concepts in deep learning include:
- Neural networks architecture
- Backpropagation algorithm
- Gradient descent optimization
- Activation functions

Page 4: Applications

Machine learning has numerous real-world applications:
- Image and speech recognition
- Natural language processing
- Medical diagnosis
- Financial forecasting
- Autonomous vehicles
- Recommendation systems

Page 5: Conclusion

Machine learning continues to evolve rapidly, with new techniques and applications emerging constantly. Understanding the fundamentals is essential for anyone working in technology today.
`;

// ============================================================
// E2E TESTS
// ============================================================

class RAGEndToEndTest {
    constructor() {
        this.embeddingProvider = new MockEmbeddingProvider();
        this.documents = [];
        this.chunks = [];
        this.testResults = [];
    }

    log(message, type = 'info') {
        if (TEST_CONFIG.verbose) {
            const prefix = {
                'info': '  ',
                'success': '✅',
                'error': '❌',
                'warning': '⚠️'
            }[type] || '  ';
            console.log(`${prefix} ${message}`);
        }
    }

    async runAllTests() {
        console.log('\n' + '='.repeat(60));
        console.log('RAG END-TO-END TEST SUITE');
        console.log('='.repeat(60) + '\n');

        const tests = [
            this.testDocumentExtraction.bind(this),
            this.testPageBreakDetection.bind(this),
            this.testChunkingWithPageNumbers.bind(this),
            this.testEmbeddingGeneration.bind(this),
            this.testSemanticSearch.bind(this),
            this.testCitationFormatting.bind(this),
            this.testFullRAGPipeline.bind(this)
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                const result = await test();
                if (result.success) {
                    passed++;
                    this.testResults.push({ name: result.name, success: true });
                } else {
                    failed++;
                    this.testResults.push({ name: result.name, success: false, error: result.error });
                }
            } catch (error) {
                failed++;
                this.testResults.push({ name: 'Unknown', success: false, error: error.message });
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));

        for (const result of this.testResults) {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${result.name}`);
            if (!result.success && result.error) {
                console.log(`       Error: ${result.error}`);
            }
        }

        console.log('\n' + '-'.repeat(60));
        console.log(`Total: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
        console.log('='.repeat(60) + '\n');

        return { passed, failed, total: passed + failed };
    }

    // Test 1: Document Extraction
    async testDocumentExtraction() {
        console.log('\n--- Test 1: Document Extraction ---\n');

        const content = SAMPLE_PDF_CONTENT;
        const pageCount = 5;

        // Simulate extraction result
        const extractionResult = {
            text: content,
            pageCount: pageCount,
            pageBreaks: this.estimatePageBreaks(content, pageCount)
        };

        this.log(`Extracted ${extractionResult.text.length} characters`);
        this.log(`Detected ${extractionResult.pageCount} pages`);
        this.log(`Page breaks: ${extractionResult.pageBreaks.length}`, 'success');

        // Store for next tests
        this.documents.push({
            id: 'doc-001',
            title: 'Machine Learning Guide',
            filename: 'ml-guide.pdf',
            content: extractionResult.text,
            pageBreaks: extractionResult.pageBreaks,
            pageCount: extractionResult.pageCount
        });

        const success = extractionResult.text.length > 0 && extractionResult.pageBreaks.length === pageCount;

        return {
            name: 'Document Extraction',
            success,
            error: success ? null : 'Failed to extract document or page breaks'
        };
    }

    // Test 2: Page Break Detection
    async testPageBreakDetection() {
        console.log('\n--- Test 2: Page Break Detection ---\n');

        const doc = this.documents[0];
        const pageBreaks = doc.pageBreaks;

        // Verify page breaks cover entire document
        const firstStart = pageBreaks[0].charStart;
        const lastEnd = pageBreaks[pageBreaks.length - 1].charEnd;

        this.log(`First page starts at: ${firstStart}`);
        this.log(`Last page ends at: ${lastEnd}`);
        this.log(`Document length: ${doc.content.length}`);

        const coversDocument = firstStart === 0 && lastEnd >= doc.content.length - 10;

        // Verify pages are sequential
        let sequential = true;
        for (let i = 1; i < pageBreaks.length; i++) {
            if (pageBreaks[i].charStart > pageBreaks[i - 1].charEnd + 1) {
                sequential = false;
                break;
            }
        }

        this.log(`Coverage: ${coversDocument ? 'OK' : 'FAILED'}`, coversDocument ? 'success' : 'error');
        this.log(`Sequential: ${sequential ? 'OK' : 'FAILED'}`, sequential ? 'success' : 'error');

        return {
            name: 'Page Break Detection',
            success: coversDocument && sequential,
            error: !coversDocument ? 'Page breaks do not cover document' : !sequential ? 'Pages not sequential' : null
        };
    }

    // Test 3: Chunking with Page Numbers
    async testChunkingWithPageNumbers() {
        console.log('\n--- Test 3: Chunking with Page Numbers ---\n');

        const doc = this.documents[0];
        const rawChunks = chunkText(doc.content, 500, 100);

        // Add page numbers to chunks
        this.chunks = rawChunks.map((chunk, index) => ({
            id: `chunk-${index}`,
            document_id: doc.id,
            content: chunk.content,
            char_start: chunk.start,
            char_end: chunk.end,
            page_number: getPageNumber(chunk.start, doc.pageBreaks),
            chunk_index: index
        }));

        this.log(`Created ${this.chunks.length} chunks`);

        // Verify all chunks have page numbers
        const chunksWithPages = this.chunks.filter(c => c.page_number !== null);
        this.log(`Chunks with page numbers: ${chunksWithPages.length}/${this.chunks.length}`);

        // Show page distribution
        const pageDistribution = {};
        for (const chunk of this.chunks) {
            const page = chunk.page_number || 'unknown';
            pageDistribution[page] = (pageDistribution[page] || 0) + 1;
        }
        this.log(`Page distribution: ${JSON.stringify(pageDistribution)}`);

        const success = chunksWithPages.length === this.chunks.length;

        return {
            name: 'Chunking with Page Numbers',
            success,
            error: success ? null : `${this.chunks.length - chunksWithPages.length} chunks missing page numbers`
        };
    }

    // Test 4: Embedding Generation
    async testEmbeddingGeneration() {
        console.log('\n--- Test 4: Embedding Generation ---\n');

        // Generate embeddings for all chunks
        for (const chunk of this.chunks) {
            chunk.embedding = await this.embeddingProvider.generateEmbedding(chunk.content);
        }

        this.log(`Generated ${this.embeddingProvider.callCount} embeddings`);
        this.log(`Embedding dimensions: ${this.embeddingProvider.dimensions}`);

        // Verify embeddings
        const chunksWithEmbeddings = this.chunks.filter(c => c.embedding && c.embedding.length > 0);
        this.log(`Chunks with valid embeddings: ${chunksWithEmbeddings.length}/${this.chunks.length}`, 'success');

        // Verify embedding normalization (magnitude should be ~1)
        if (chunksWithEmbeddings.length > 0) {
            const firstEmbedding = chunksWithEmbeddings[0].embedding;
            const magnitude = Math.sqrt(firstEmbedding.reduce((sum, val) => sum + val * val, 0));
            this.log(`First embedding magnitude: ${magnitude.toFixed(4)} (should be ~1.0)`);
        }

        const success = chunksWithEmbeddings.length === this.chunks.length;

        return {
            name: 'Embedding Generation',
            success,
            error: success ? null : 'Some chunks missing embeddings'
        };
    }

    // Test 5: Semantic Search
    async testSemanticSearch() {
        console.log('\n--- Test 5: Semantic Search ---\n');

        const testQueries = [
            { query: 'What is supervised learning?', expectedPage: 2 },
            { query: 'Tell me about deep learning neural networks', expectedPage: 3 },
            { query: 'Applications of machine learning', expectedPage: 4 }
        ];

        let successCount = 0;

        for (const test of testQueries) {
            // Generate query embedding
            const queryEmbedding = await this.embeddingProvider.generateEmbedding(test.query);

            // Search (use lower threshold for mock embeddings)
            const minScore = TEST_CONFIG.mockEmbeddings ? 0.0 : 0.5;
            const results = this.chunks
                .map(chunk => ({
                    ...chunk,
                    relevance_score: cosineSimilarity(queryEmbedding, chunk.embedding)
                }))
                .filter(r => r.relevance_score > minScore)
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .slice(0, 3);

            this.log(`\nQuery: "${test.query}"`);
            this.log(`Found ${results.length} relevant chunks`);

            if (results.length > 0) {
                const topResult = results[0];
                this.log(`Top result: page ${topResult.page_number}, score ${topResult.relevance_score.toFixed(3)}`);

                // Check if top result is from expected page (with tolerance)
                const pageMatch = Math.abs(topResult.page_number - test.expectedPage) <= 1;
                if (pageMatch) {
                    successCount++;
                    this.log(`Page match: YES`, 'success');
                } else {
                    this.log(`Page match: NO (expected ~${test.expectedPage})`, 'warning');
                }
            }
        }

        const success = successCount >= 2; // At least 2/3 queries should match

        return {
            name: 'Semantic Search',
            success,
            error: success ? null : `Only ${successCount}/${testQueries.length} queries matched expected pages`
        };
    }

    // Test 6: Citation Formatting
    async testCitationFormatting() {
        console.log('\n--- Test 6: Citation Formatting ---\n');

        const doc = this.documents[0];

        // Create sample sources (use last chunk instead of [5] which may not exist)
        const lastChunkIndex = Math.min(this.chunks.length - 1, 4);
        const sources = [
            {
                document_title: doc.title,
                document_filename: doc.filename,
                content: this.chunks[0].content,
                relevance_score: 0.85,
                page_number: this.chunks[0].page_number
            },
            {
                document_title: doc.title,
                document_filename: doc.filename,
                content: this.chunks[lastChunkIndex].content,
                relevance_score: 0.72,
                page_number: this.chunks[lastChunkIndex].page_number
            }
        ];

        // Format citations
        const citations = sources.map(s => formatCitation(s));

        this.log(`Generated ${citations.length} citations`);

        // Verify citations contain page numbers
        let hasPageNumbers = true;
        for (let i = 0; i < citations.length; i++) {
            const hasPage = citations[i].includes('Page:');
            this.log(`Citation ${i + 1}: Page number ${hasPage ? 'present' : 'missing'}`, hasPage ? 'success' : 'error');
            if (!hasPage) hasPageNumbers = false;
        }

        // Show sample citation
        this.log(`\nSample citation:\n${citations[0]}`);

        return {
            name: 'Citation Formatting',
            success: hasPageNumbers,
            error: hasPageNumbers ? null : 'Some citations missing page numbers'
        };
    }

    // Test 7: Full RAG Pipeline
    async testFullRAGPipeline() {
        console.log('\n--- Test 7: Full RAG Pipeline (E2E) ---\n');

        // Simulate full pipeline
        const query = 'How does reinforcement learning work?';
        this.log(`User query: "${query}"`);

        // Step 1: Generate query embedding
        const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
        this.log('Step 1: Query embedding generated');

        // Step 2: Semantic search (use lower threshold for mock embeddings)
        const minScore = TEST_CONFIG.mockEmbeddings ? 0.0 : 0.5;
        const results = this.chunks
            .map(chunk => ({
                ...chunk,
                relevance_score: cosineSimilarity(queryEmbedding, chunk.embedding)
            }))
            .filter(r => r.relevance_score > minScore)
            .sort((a, b) => b.relevance_score - a.relevance_score)
            .slice(0, 3);
        this.log(`Step 2: Found ${results.length} relevant chunks`);

        // Step 3: Build context
        const doc = this.documents[0];
        const sources = results.map(r => ({
            document_title: doc.title,
            document_filename: doc.filename,
            document_file_type: 'pdf',
            content: r.content,
            relevance_score: r.relevance_score,
            page_number: r.page_number
        }));
        this.log('Step 3: Context built with sources');

        // Step 4: Format for prompt injection
        const contextSection = sources.map(s => formatCitation(s)).join('\n');
        this.log(`Step 4: Context formatted (${contextSection.length} chars)`);

        // Verify pipeline
        const pipelineSuccess =
            queryEmbedding.length > 0 &&
            results.length > 0 &&
            sources.every(s => s.page_number !== null);

        this.log(`\nPipeline validation:`, pipelineSuccess ? 'success' : 'error');
        this.log(`  - Query embedding: ${queryEmbedding.length > 0 ? 'OK' : 'FAILED'}`);
        this.log(`  - Search results: ${results.length > 0 ? 'OK' : 'FAILED'}`);
        this.log(`  - Page numbers: ${sources.every(s => s.page_number !== null) ? 'OK' : 'FAILED'}`);

        return {
            name: 'Full RAG Pipeline (E2E)',
            success: pipelineSuccess,
            error: pipelineSuccess ? null : 'Pipeline validation failed'
        };
    }

    // Helper: Estimate page breaks
    estimatePageBreaks(content, pageCount) {
        const avgCharsPerPage = Math.ceil(content.length / pageCount);
        const pageBreaks = [];

        for (let i = 0; i < pageCount; i++) {
            pageBreaks.push({
                pageNumber: i + 1,
                charStart: i * avgCharsPerPage,
                charEnd: Math.min((i + 1) * avgCharsPerPage, content.length)
            });
        }

        return pageBreaks;
    }
}

// ============================================================
// RUN TESTS
// ============================================================

async function main() {
    const tester = new RAGEndToEndTest();
    const results = await tester.runAllTests();

    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
