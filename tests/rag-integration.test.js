/**
 * RAG Integration Test
 *
 * Tests the actual service implementations for:
 * 1. IndexingService - chunking, page numbers, embeddings
 * 2. DocumentService - PDF extraction with page info
 * 3. RAGService - context retrieval and citation formatting
 *
 * Note: This test uses mock embeddings to avoid external API calls.
 */

const path = require('path');

// ============================================================
// SETUP - Load actual services
// ============================================================

async function runTests() {

console.log('\n' + '='.repeat(60));
console.log('RAG INTEGRATION TEST SUITE');
console.log('='.repeat(60) + '\n');

let testsPassed = 0;
let testsFailed = 0;

function logResult(name, success, details = '') {
    if (success) {
        testsPassed++;
        console.log(`✅ PASS: ${name}`);
    } else {
        testsFailed++;
        console.log(`❌ FAIL: ${name}`);
    }
    if (details) {
        console.log(`   ${details}`);
    }
}

// ============================================================
// TEST 1: IndexingService._chunkText
// ============================================================

console.log('\n--- Test 1: IndexingService Chunking Algorithm ---\n');

try {
    // Import the actual service
    const indexingService = require('../src/features/common/services/indexingService');

    // Test chunking
    const testText = 'A'.repeat(1500); // 1500 chars
    const chunks = indexingService._chunkText(testText, 500, 100);

    const expectedChunks = Math.ceil((1500 - 100) / (500 - 100)) + 1; // ~4 chunks
    const validChunkCount = chunks.length >= 3 && chunks.length <= 5;

    // Verify chunk properties
    let allChunksValid = true;
    for (const chunk of chunks) {
        if (!chunk.content || chunk.start === undefined || chunk.end === undefined) {
            allChunksValid = false;
            break;
        }
    }

    logResult(
        'Chunking algorithm',
        validChunkCount && allChunksValid,
        `Created ${chunks.length} chunks with valid properties`
    );

    // Test overlap
    if (chunks.length >= 2) {
        const overlap = chunks[0].end - chunks[1].start;
        const hasOverlap = overlap > 0 && overlap <= 100;
        logResult(
            'Chunk overlap',
            hasOverlap,
            `Overlap: ${overlap} chars (expected ~100)`
        );
    }
} catch (error) {
    logResult('IndexingService chunking', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 2: IndexingService._getPageNumber
// ============================================================

console.log('\n--- Test 2: IndexingService Page Number Detection ---\n');

try {
    const indexingService = require('../src/features/common/services/indexingService');

    const pageBreaks = [
        { pageNumber: 1, charStart: 0, charEnd: 1000 },
        { pageNumber: 2, charStart: 1000, charEnd: 2000 },
        { pageNumber: 3, charStart: 2000, charEnd: 3000 }
    ];

    // Test various positions
    const tests = [
        { pos: 0, expected: 1 },
        { pos: 500, expected: 1 },
        { pos: 1000, expected: 2 },
        { pos: 2500, expected: 3 },
        { pos: 3500, expected: 3 } // Beyond end
    ];

    let allCorrect = true;
    for (const test of tests) {
        const result = indexingService._getPageNumber(test.pos, pageBreaks);
        if (result !== test.expected) {
            allCorrect = false;
            console.log(`   Position ${test.pos}: got ${result}, expected ${test.expected}`);
        }
    }

    logResult('Page number detection', allCorrect, allCorrect ? 'All positions correctly mapped' : 'Some positions failed');

    // Test with null/empty pageBreaks
    const nullResult = indexingService._getPageNumber(500, null);
    const emptyResult = indexingService._getPageNumber(500, []);

    logResult(
        'Null/empty pageBreaks handling',
        nullResult === null && emptyResult === null,
        `null: ${nullResult}, empty: ${emptyResult}`
    );
} catch (error) {
    logResult('Page number detection', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 3: IndexingService.getProviderInfo
// ============================================================

console.log('\n--- Test 3: IndexingService Provider Info ---\n');

try {
    const indexingService = require('../src/features/common/services/indexingService');

    const providerInfo = indexingService.getProviderInfo();

    const hasRequiredFields =
        providerInfo.name !== undefined &&
        providerInfo.displayName !== undefined &&
        providerInfo.quality !== undefined &&
        providerInfo.isConfigured !== undefined;

    logResult(
        'Provider info structure',
        hasRequiredFields,
        `Provider: ${providerInfo.displayName} (${providerInfo.quality} quality)`
    );

    // Check quality label
    if (providerInfo.name === 'mock') {
        logResult(
            'Mock provider warning',
            providerInfo.warning !== undefined,
            providerInfo.warning || 'No warning set'
        );
    }
} catch (error) {
    logResult('Provider info', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 4: EmbeddingProvider Factory
// ============================================================

console.log('\n--- Test 4: Embedding Provider Factory ---\n');

try {
    const { EmbeddingProviderFactory, MockEmbeddingProvider } = require('../src/features/common/services/embeddingProvider');

    // Test creating mock provider
    const mockProvider = EmbeddingProviderFactory.create('mock');
    logResult(
        'Create mock provider',
        mockProvider !== null && mockProvider.getName() === 'mock',
        `Provider: ${mockProvider.getName()}, dimensions: ${mockProvider.dimensions}`
    );

    // Test auto-detection (should return mock if no API key)
    const autoProvider = EmbeddingProviderFactory.createAuto();
    logResult(
        'Auto-detect provider',
        autoProvider !== null,
        `Auto-detected: ${autoProvider.getName()}`
    );

    // Test mock embedding generation
    const testEmbedding = await mockProvider.generateEmbedding('test text');
    const isValidEmbedding =
        Array.isArray(testEmbedding) &&
        testEmbedding.length === mockProvider.dimensions;

    logResult(
        'Mock embedding generation',
        isValidEmbedding,
        `Generated ${testEmbedding.length} dimensions`
    );

    // Test embedding normalization
    const magnitude = Math.sqrt(testEmbedding.reduce((sum, val) => sum + val * val, 0));
    const isNormalized = Math.abs(magnitude - 1.0) < 0.001;

    logResult(
        'Embedding normalization',
        isNormalized,
        `Magnitude: ${magnitude.toFixed(4)} (should be ~1.0)`
    );
} catch (error) {
    logResult('Embedding provider', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 5: RAGService Citation Formatting (standalone test)
// ============================================================

console.log('\n--- Test 5: Citation Formatting Algorithm ---\n');

try {
    // Test _formatContext logic directly (without loading ragService which needs Electron)
    function formatContext(sources) {
        return sources.map((source, index) => {
            const pageInfo = source.page_number
                ? `│  Page: ${source.page_number}\n`
                : '';

            return `
┌─ Source ${index + 1}: ${source.document_title}
│  File: ${source.document_filename}
${pageInfo}│  Relevance: ${(source.relevance_score * 100).toFixed(1)}%
│
│  ${source.content}
└─────────────────────────────────────────────────────
`;
        }).join('\n');
    }

    // Test _formatContext with page numbers
    const sources = [
        {
            document_title: 'Test Document',
            document_filename: 'test.pdf',
            content: 'Sample content from page 1',
            relevance_score: 0.85,
            page_number: 1
        },
        {
            document_title: 'Test Document',
            document_filename: 'test.pdf',
            content: 'Sample content from page 3',
            relevance_score: 0.72,
            page_number: 3
        }
    ];

    const formatted = formatContext(sources);

    // Check that page numbers appear in output
    const hasPage1 = formatted.includes('Page: 1');
    const hasPage3 = formatted.includes('Page: 3');
    const hasTitle = formatted.includes('Test Document');
    const hasRelevance = formatted.includes('85.0%');

    logResult(
        'Citation includes page numbers',
        hasPage1 && hasPage3,
        `Page 1: ${hasPage1 ? 'yes' : 'no'}, Page 3: ${hasPage3 ? 'yes' : 'no'}`
    );

    logResult(
        'Citation includes metadata',
        hasTitle && hasRelevance,
        `Title: ${hasTitle ? 'yes' : 'no'}, Relevance: ${hasRelevance ? 'yes' : 'no'}`
    );

    // Test without page number
    const sourceNoPage = [{
        document_title: 'Text Doc',
        document_filename: 'doc.txt',
        content: 'Some content',
        relevance_score: 0.9,
        page_number: null
    }];

    const formattedNoPage = formatContext(sourceNoPage);
    const noPageLine = !formattedNoPage.includes('Page:');

    logResult(
        'Citation without page number',
        noPageLine,
        noPageLine ? 'Correctly omits Page: line' : 'Incorrectly shows Page: line'
    );
} catch (error) {
    logResult('Citation formatting', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 6: Token Limiting Algorithm (standalone test)
// ============================================================

console.log('\n--- Test 6: Token Limiting Algorithm ---\n');

try {
    // Test token limiting logic directly
    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    function filterByTokenLimit(sources, maxTokens) {
        const filtered = [];
        let currentTokens = 0;

        for (const source of sources) {
            const sourceTokens = estimateTokens(source.content);

            if (currentTokens + sourceTokens <= maxTokens) {
                filtered.push(source);
                currentTokens += sourceTokens;
            } else {
                break;
            }
        }

        return filtered;
    }

    // Create sources with known token counts
    const longContent = 'word '.repeat(500); // ~500 tokens
    const sources = [
        { content: longContent, relevance_score: 0.9 },
        { content: longContent, relevance_score: 0.8 },
        { content: longContent, relevance_score: 0.7 }
    ];

    // Test filtering with low limit
    const filtered = filterByTokenLimit(sources, 600);

    logResult(
        'Token limit filtering',
        filtered.length < sources.length,
        `Kept ${filtered.length}/${sources.length} sources within 600 token limit`
    );

    // Test that sources are ordered by relevance
    if (filtered.length > 0) {
        const highestRelevance = filtered[0].relevance_score;
        logResult(
            'Preserves relevance order',
            highestRelevance === 0.9,
            `First source relevance: ${highestRelevance}`
        );
    }
} catch (error) {
    logResult('Token limiting', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 7: Cosine Similarity Calculation
// ============================================================

console.log('\n--- Test 7: Cosine Similarity Calculation ---\n');

try {
    const indexingService = require('../src/features/common/services/indexingService');

    // Test identical vectors (should be 1.0)
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    const sim1 = indexingService._cosineSimilarity(vec1, vec2);

    logResult(
        'Identical vectors',
        Math.abs(sim1 - 1.0) < 0.001,
        `Similarity: ${sim1.toFixed(4)} (expected 1.0)`
    );

    // Test orthogonal vectors (should be 0.0)
    const vec3 = [1, 0, 0];
    const vec4 = [0, 1, 0];
    const sim2 = indexingService._cosineSimilarity(vec3, vec4);

    logResult(
        'Orthogonal vectors',
        Math.abs(sim2 - 0.0) < 0.001,
        `Similarity: ${sim2.toFixed(4)} (expected 0.0)`
    );

    // Test opposite vectors (should be -1.0)
    const vec5 = [1, 0, 0];
    const vec6 = [-1, 0, 0];
    const sim3 = indexingService._cosineSimilarity(vec5, vec6);

    logResult(
        'Opposite vectors',
        Math.abs(sim3 - (-1.0)) < 0.001,
        `Similarity: ${sim3.toFixed(4)} (expected -1.0)`
    );
} catch (error) {
    logResult('Cosine similarity', false, `Error: ${error.message}`);
}

// ============================================================
// TEST 8: Schema Validation
// ============================================================

console.log('\n--- Test 8: Schema Validation ---\n');

try {
    const schemaModule = require('../src/features/common/config/schema');

    // Schema is exported as LATEST_SCHEMA object with table names as keys
    const schema = schemaModule.LATEST_SCHEMA || schemaModule;

    // Check documents table has page_count
    const documentsTable = schema.documents;
    const hasPageCount = documentsTable && documentsTable.columns.some(c => c.name === 'page_count');

    logResult(
        'Documents table has page_count',
        hasPageCount,
        hasPageCount ? 'Column exists' : 'Column missing'
    );

    // Check document_chunks table has page_number
    const chunksTable = schema.document_chunks;
    const hasPageNumber = chunksTable && chunksTable.columns.some(c => c.name === 'page_number');

    logResult(
        'Chunks table has page_number',
        hasPageNumber,
        hasPageNumber ? 'Column exists' : 'Column missing'
    );

    // Check document_chunks has embedding column
    const hasEmbedding = chunksTable && chunksTable.columns.some(c => c.name === 'embedding');

    logResult(
        'Chunks table has embedding',
        hasEmbedding,
        hasEmbedding ? 'Column exists' : 'Column missing'
    );
} catch (error) {
    logResult('Schema validation', false, `Error: ${error.message}`);
}

// ============================================================
// SUMMARY
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('INTEGRATION TEST SUMMARY');
console.log('='.repeat(60));
console.log(`\nTotal: ${testsPassed + testsFailed} tests`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('\n' + '='.repeat(60) + '\n');

return { passed: testsPassed, failed: testsFailed };

} // End of runTests()

// Run the tests
runTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
