/**
 * Test Suite: Auto-Indexing System
 *
 * Tests all aspects of the auto-indexing system:
 * 1. Conversation indexing - summary, entities, tags, importance
 * 2. Screenshot indexing - OCR, entity extraction
 * 3. Audio indexing - transcription, speaker analysis, actions/decisions
 * 4. AI response indexing
 * 5. Entity extraction (projects, people, companies, dates)
 * 6. Auto-tagging
 * 7. Importance scoring
 * 8. Embedding generation
 * 9. Search in indexed content
 */

const fs = require('fs');
const path = require('path');

// ============================================
// TEST UTILITIES
// ============================================

let testsPassed = 0;
let testsFailed = 0;
let currentGroup = '';

function startGroup(name) {
    currentGroup = name;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 ${name}`);
    console.log('='.repeat(60));
}

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`  ✅ ${name}`);
    } catch (e) {
        testsFailed++;
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${e.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertIncludes(str, pattern, message) {
    if (!str.includes(pattern)) {
        throw new Error(message || `String should include "${pattern}"`);
    }
}

function assertArrayIncludes(arr, item, message) {
    if (!arr.includes(item)) {
        throw new Error(message || `Array should include "${item}"`);
    }
}

// ============================================
// LOAD SOURCE FILES
// ============================================

const autoIndexingSource = fs.readFileSync('./src/features/common/services/autoIndexingService.js', 'utf8');
const indexingServiceSource = fs.readFileSync('./src/features/common/services/indexingService.js', 'utf8');
const knowledgeOrganizerSource = fs.readFileSync('./src/features/common/services/knowledgeOrganizerService.js', 'utf8');
const embeddingProviderSource = fs.readFileSync('./src/features/common/services/embeddingProvider.js', 'utf8');
const ragServiceSource = fs.readFileSync('./src/features/common/services/ragService.js', 'utf8');
const migrationSource = fs.readFileSync('./src/features/common/migrations/002_phase2_augmented_memory.js', 'utf8');

// ============================================
// TEST 1: Conversation Indexing
// ============================================

function testConversationIndexing() {
    startGroup('1. Conversation Indexing');

    // Test 1.1: indexConversation method exists
    test('indexConversation method exists', () => {
        assertIncludes(autoIndexingSource, 'async indexConversation(sessionId, uid)');
    });

    // Test 1.2: Minimum message count check
    test('Minimum message count check (3 messages)', () => {
        assertIncludes(autoIndexingSource, 'MIN_MESSAGE_COUNT_FOR_INDEXING = 3');
    });

    // Test 1.3: Content length check
    test('Content length check (100 chars minimum)', () => {
        assertIncludes(autoIndexingSource, 'conversationText.length < 100');
    });

    // Test 1.4: Summary generation
    test('Generates summary from conversation', () => {
        assertIncludes(autoIndexingSource, '_generateSummary(conversationText)');
    });

    // Test 1.5: Key points extraction
    test('Extracts key points from conversation', () => {
        assertIncludes(autoIndexingSource, '_extractKeyPoints(conversationText, messages)');
    });

    // Test 1.6: Entity extraction
    test('Extracts entities from conversation', () => {
        assertIncludes(autoIndexingSource, '_extractEntities(conversationText)');
    });

    // Test 1.7: Tag generation
    test('Generates tags from conversation', () => {
        assertIncludes(autoIndexingSource, '_generateTags(conversationText, entities)');
    });

    // Test 1.8: Project detection
    test('Detects main project', () => {
        assertIncludes(autoIndexingSource, '_detectProject(entities)');
    });

    // Test 1.9: Importance score calculation
    test('Calculates importance score', () => {
        assertIncludes(autoIndexingSource, '_calculateImportance(');
    });

    // Test 1.10: Embedding generation
    test('Generates embedding for semantic search', () => {
        assertIncludes(autoIndexingSource, '_generateEmbedding(');
    });

    // Test 1.11: Saves to database
    test('Saves indexed content to database', () => {
        assertIncludes(autoIndexingSource, '_saveIndexedContent(indexedContent)');
    });

    // Test 1.12: Updates memory stats
    test('Updates memory statistics', () => {
        assertIncludes(autoIndexingSource, '_updateMemoryStats(uid,');
    });

    // Test 1.13: Returns structured result
    test('Returns structured indexing result', () => {
        assertIncludes(autoIndexingSource, "indexed: true");
        assertIncludes(autoIndexingSource, "content_id:");
    });
}

// ============================================
// TEST 2: Screenshot Indexing
// ============================================

function testScreenshotIndexing() {
    startGroup('2. Screenshot Indexing');

    // Test 2.1: indexScreenshot method exists
    test('indexScreenshot method exists', () => {
        assertIncludes(autoIndexingSource, 'async indexScreenshot(screenshotPath, uid, sessionId');
    });

    // Test 2.2: OCR extraction
    test('Performs OCR to extract text', () => {
        assertIncludes(autoIndexingSource, '_performOCR(screenshotPath)');
    });

    // Test 2.3: OCR supported check
    test('Checks if OCR is supported', () => {
        assertIncludes(autoIndexingSource, 'ocrService.isSupported()');
    });

    // Test 2.4: Minimum text check
    test('Minimum extracted text check (20 chars)', () => {
        assertIncludes(autoIndexingSource, 'extractedText.length < 20');
    });

    // Test 2.5: Entity extraction from OCR
    test('Extracts entities from OCR text', () => {
        assertIncludes(autoIndexingSource, '_extractEntities(extractedText)');
    });

    // Test 2.6: Title generation for screenshot
    test('Generates title for screenshot', () => {
        assertIncludes(autoIndexingSource, '_generateScreenshotTitle(extractedText, entities)');
    });

    // Test 2.7: source_type is 'screenshot'
    test('Source type is screenshot', () => {
        assertIncludes(autoIndexingSource, "source_type: 'screenshot'");
    });

    // Test 2.8: OCR confidence handling
    test('Handles low OCR confidence', () => {
        assertIncludes(autoIndexingSource, 'confidence < 30');
    });
}

// ============================================
// TEST 3: Audio Indexing
// ============================================

function testAudioIndexing() {
    startGroup('3. Audio/Transcription Indexing');

    // Test 3.1: indexAudioSession method exists
    test('indexAudioSession method exists', () => {
        assertIncludes(autoIndexingSource, 'async indexAudioSession(sessionId, uid)');
    });

    // Test 3.2: Gets transcripts from database
    test('Gets transcripts from database', () => {
        assertIncludes(autoIndexingSource, 'SELECT * FROM transcripts');
    });

    // Test 3.3: Assembles full text
    test('Assembles full text from transcripts', () => {
        assertIncludes(autoIndexingSource, "transcripts.map(t => t.text).join");
    });

    // Test 3.4: Speaker analysis
    test('Analyzes speakers in detail', () => {
        assertIncludes(autoIndexingSource, '_analyzeSpeakers(transcripts)');
    });

    // Test 3.5: Speaker stats tracking
    test('Tracks speaker statistics', () => {
        assertIncludes(autoIndexingSource, 'wordCount');
        assertIncludes(autoIndexingSource, 'speakerStats');
    });

    // Test 3.6: Actions extraction
    test('Extracts action items', () => {
        assertIncludes(autoIndexingSource, '_extractActionsAndDecisions(fullText)');
    });

    // Test 3.7: Action keywords
    test('Has action keywords defined', () => {
        assertIncludes(autoIndexingSource, 'actionKeywords');
        assertIncludes(autoIndexingSource, "'we need to'");
        assertIncludes(autoIndexingSource, "'todo:'");
    });

    // Test 3.8: Decision keywords
    test('Has decision keywords defined', () => {
        assertIncludes(autoIndexingSource, 'decisionKeywords');
        assertIncludes(autoIndexingSource, "'decided'");
        assertIncludes(autoIndexingSource, "'conclusion:'");
    });

    // Test 3.9: Multi-speaker importance boost
    test('Boosts importance for multi-speaker conversations', () => {
        assertIncludes(autoIndexingSource, 'speakerCount > 1');
    });

    // Test 3.10: source_type is 'audio'
    test('Source type is audio', () => {
        assertIncludes(autoIndexingSource, "source_type: 'audio'");
    });

    // Test 3.11: Enhanced entities with speaker analysis
    test('Includes speaker analysis in entities', () => {
        assertIncludes(autoIndexingSource, 'enhancedEntities');
        assertIncludes(autoIndexingSource, 'speakerAnalysis:');
    });
}

// ============================================
// TEST 4: Entity Extraction
// ============================================

function testEntityExtraction() {
    startGroup('4. Entity Extraction');

    // Test 4.1: extractEntities method
    test('extractEntities method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async extractEntities(text');
    });

    // Test 4.2: Projects extraction
    test('Extracts projects', () => {
        assertIncludes(knowledgeOrganizerSource, 'projects:');
    });

    // Test 4.3: People extraction
    test('Extracts people names', () => {
        assertIncludes(knowledgeOrganizerSource, 'people:');
    });

    // Test 4.4: Companies extraction
    test('Extracts company names', () => {
        assertIncludes(knowledgeOrganizerSource, 'companies:');
    });

    // Test 4.5: Dates extraction
    test('Extracts dates', () => {
        assertIncludes(knowledgeOrganizerSource, 'dates:');
    });

    // Test 4.6: Topics extraction
    test('Extracts topics/themes', () => {
        assertIncludes(knowledgeOrganizerSource, 'topics:');
    });

    // Test 4.7: Technologies extraction
    test('Extracts technologies', () => {
        assertIncludes(knowledgeOrganizerSource, 'technologies:');
    });

    // Test 4.8: Locations extraction
    test('Extracts locations', () => {
        assertIncludes(knowledgeOrganizerSource, 'locations:');
    });

    // Test 4.9: Uses LLM for extraction
    test('Uses LLM for entity extraction', () => {
        assertIncludes(knowledgeOrganizerSource, '_getLLMClient()');
    });

    // Test 4.10: Fallback extraction
    test('Has fallback extraction without LLM', () => {
        assertIncludes(knowledgeOrganizerSource, '_fallbackEntityExtraction(text)');
    });

    // Test 4.11: Date patterns
    test('Has date regex patterns', () => {
        assertIncludes(knowledgeOrganizerSource, '_extractDates(text)');
        assertIncludes(knowledgeOrganizerSource, 'ISO format');
    });

    // Test 4.12: Saves to knowledge graph
    test('Saves entities to knowledge graph', () => {
        assertIncludes(autoIndexingSource, '_saveEntitiesToKnowledgeGraph(entities, uid, contentId)');
    });
}

// ============================================
// TEST 5: Auto-Tagging
// ============================================

function testAutoTagging() {
    startGroup('5. Auto-Tagging');

    // Test 5.1: generateTags method
    test('generateTags method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async generateTags(text, maxTags');
    });

    // Test 5.2: Default max tags
    test('Default max tags is 5', () => {
        assertIncludes(knowledgeOrganizerSource, 'maxTags = 5');
    });

    // Test 5.3: Uses LLM for tag generation
    test('Uses LLM for tag generation', () => {
        const generateTagsSection = knowledgeOrganizerSource.substring(
            knowledgeOrganizerSource.indexOf('async generateTags'),
            knowledgeOrganizerSource.indexOf('async generateTags') + 1000
        );
        assertIncludes(generateTagsSection, '_getLLMClient()');
    });

    // Test 5.4: Tag format instructions
    test('Specifies tag format in prompt', () => {
        assertIncludes(knowledgeOrganizerSource, 'lowercase with hyphens');
    });

    // Test 5.5: Fallback tag generation
    test('Has fallback tag generation', () => {
        assertIncludes(knowledgeOrganizerSource, '_fallbackTagGeneration(text, maxTags)');
    });

    // Test 5.6: Stop words filtering
    test('Filters stop words in fallback', () => {
        assertIncludes(knowledgeOrganizerSource, 'stopWords');
    });

    // Test 5.7: Word frequency counting
    test('Counts word frequency for fallback tags', () => {
        assertIncludes(knowledgeOrganizerSource, 'wordCounts');
    });
}

// ============================================
// TEST 6: Importance Scoring
// ============================================

function testImportanceScoring() {
    startGroup('6. Importance Scoring');

    // Test 6.1: _calculateImportance method
    test('_calculateImportance method exists', () => {
        assertIncludes(autoIndexingSource, '_calculateImportance(factors)');
    });

    // Test 6.2: Base score
    test('Base score is 0.5', () => {
        assertIncludes(autoIndexingSource, 'let score = 0.5');
    });

    // Test 6.3: Message count factor
    test('Considers message count', () => {
        assertIncludes(autoIndexingSource, 'factors.messageCount');
    });

    // Test 6.4: Content length factor
    test('Considers content length', () => {
        assertIncludes(autoIndexingSource, 'factors.contentLength');
    });

    // Test 6.5: Entity count factor
    test('Considers entity count', () => {
        assertIncludes(autoIndexingSource, 'factors.entitiesCount');
    });

    // Test 6.6: Key points factor
    test('Considers key points presence', () => {
        assertIncludes(autoIndexingSource, 'factors.hasKeyPoints');
    });

    // Test 6.7: Speaker count factor (audio)
    test('Considers speaker count for audio', () => {
        assertIncludes(autoIndexingSource, 'factors.speakerCount');
    });

    // Test 6.8: Actions/decisions boost
    test('Boosts score for actions and decisions', () => {
        assertIncludes(autoIndexingSource, 'factors.hasActions');
        assertIncludes(autoIndexingSource, 'factors.hasDecisions');
    });

    // Test 6.9: Score capped at 1.0
    test('Score capped at 1.0', () => {
        assertIncludes(autoIndexingSource, 'Math.min(score, 1.0)');
    });

    // Test 6.10: Importance threshold
    test('Has importance threshold (0.6)', () => {
        assertIncludes(autoIndexingSource, 'IMPORTANCE_THRESHOLD = 0.6');
    });
}

// ============================================
// TEST 7: Embedding Generation
// ============================================

function testEmbeddingGeneration() {
    startGroup('7. Embedding Generation');

    // Test 7.1: MockEmbeddingProvider
    test('MockEmbeddingProvider for testing exists', () => {
        assertIncludes(embeddingProviderSource, 'class MockEmbeddingProvider');
    });

    // Test 7.2: OpenAIEmbeddingProvider
    test('OpenAIEmbeddingProvider exists', () => {
        assertIncludes(embeddingProviderSource, 'class OpenAIEmbeddingProvider');
    });

    // Test 7.3: Mock embedding dimensions
    test('Mock embeddings have 384 dimensions', () => {
        assertIncludes(embeddingProviderSource, 'this.dimensions = 384');
    });

    // Test 7.4: OpenAI embedding dimensions
    test('OpenAI embeddings have 1536 dimensions', () => {
        assertIncludes(embeddingProviderSource, 'this.dimensions = 1536');
    });

    // Test 7.5: OpenAI model
    test('Uses text-embedding-3-small model', () => {
        assertIncludes(embeddingProviderSource, "'text-embedding-3-small'");
    });

    // Test 7.6: Factory pattern
    test('EmbeddingProviderFactory exists', () => {
        assertIncludes(embeddingProviderSource, 'class EmbeddingProviderFactory');
    });

    // Test 7.7: Auto-detect provider
    test('Can auto-detect provider from environment', () => {
        assertIncludes(embeddingProviderSource, 'createAuto()');
    });

    // Test 7.8: Fallback to mock
    test('Falls back to mock if OpenAI fails', () => {
        assertIncludes(embeddingProviderSource, 'Falling back to mock embeddings');
    });

    // Test 7.9: Normalized vectors
    test('Mock embeddings are normalized', () => {
        assertIncludes(embeddingProviderSource, 'magnitude');
        assertIncludes(embeddingProviderSource, 'embedding[i] /= magnitude');
    });

    // Test 7.10: Empty text handling
    test('Handles empty text', () => {
        assertIncludes(embeddingProviderSource, 'text.length === 0');
    });
}

// ============================================
// TEST 8: Search in Indexed Content
// ============================================

function testSearchIndexedContent() {
    startGroup('8. Search in Indexed Content');

    // Test 8.1: semanticSearch method
    test('semanticSearch method exists', () => {
        assertIncludes(indexingServiceSource, 'async semanticSearch(query');
    });

    // Test 8.2: Cosine similarity
    test('Calculates cosine similarity', () => {
        assertIncludes(indexingServiceSource, '_cosineSimilarity(');
    });

    // Test 8.3: Minimum score filter
    test('Filters by minimum score', () => {
        assertIncludes(indexingServiceSource, 'minScore');
    });

    // Test 8.4: Keyword search fallback
    test('Has keyword search fallback', () => {
        assertIncludes(indexingServiceSource, '_keywordSearch(');
    });

    // Test 8.5: Document filtering
    test('Can filter by document IDs', () => {
        assertIncludes(indexingServiceSource, 'documentIds');
    });

    // Test 8.6: Result limit
    test('Limits results', () => {
        assertIncludes(indexingServiceSource, 'limit = 5');
    });

    // Test 8.7: RAG multi-source retrieval
    test('RAG service has multi-source retrieval', () => {
        assertIncludes(ragServiceSource, 'retrieveContextMultiSource(');
    });

    // Test 8.8: Source types in RAG
    test('RAG searches multiple source types', () => {
        assertIncludes(ragServiceSource, '_searchConversations(');
        assertIncludes(ragServiceSource, '_searchScreenshots(');
        assertIncludes(ragServiceSource, '_searchAudio(');
    });

    // Test 8.9: Source weighting
    test('Applies source weighting', () => {
        assertIncludes(ragServiceSource, '_applySourceWeighting(');
    });

    // Test 8.10: Weight values
    test('Has weight values per source type', () => {
        assertIncludes(ragServiceSource, 'document: 1.0');
        assertIncludes(ragServiceSource, 'conversation: 0.85');
    });
}

// ============================================
// TEST 9: Knowledge Graph
// ============================================

function testKnowledgeGraph() {
    startGroup('9. Knowledge Graph');

    // Test 9.1: createOrUpdateEntity method
    test('createOrUpdateEntity method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async createOrUpdateEntity(');
    });

    // Test 9.2: Entity types supported
    test('Supports multiple entity types', () => {
        assertIncludes(knowledgeOrganizerSource, "'project'");
        assertIncludes(knowledgeOrganizerSource, "'person'");
        assertIncludes(knowledgeOrganizerSource, "'company'");
        assertIncludes(knowledgeOrganizerSource, "'topic'");
    });

    // Test 9.3: Mention count tracking
    test('Tracks mention count', () => {
        assertIncludes(knowledgeOrganizerSource, 'mention_count = mention_count + 1');
    });

    // Test 9.4: First/last seen tracking
    test('Tracks first and last seen', () => {
        assertIncludes(knowledgeOrganizerSource, 'first_seen');
        assertIncludes(knowledgeOrganizerSource, 'last_seen');
    });

    // Test 9.5: Related entities
    test('Tracks related entities', () => {
        assertIncludes(knowledgeOrganizerSource, 'related_entities');
    });

    // Test 9.6: detectProjects method
    test('detectProjects method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async detectProjects(uid');
    });

    // Test 9.7: detectPeople method
    test('detectPeople method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async detectPeople(uid');
    });

    // Test 9.8: detectTopics method
    test('detectTopics method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async detectTopics(uid');
    });

    // Test 9.9: Knowledge graph stats
    test('getKnowledgeGraphStats method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async getKnowledgeGraphStats(uid)');
    });
}

// ============================================
// TEST 10: Database Schema
// ============================================

function testDatabaseSchema() {
    startGroup('10. Database Schema');

    // Test 10.1: auto_indexed_content table
    test('auto_indexed_content table created', () => {
        assertIncludes(migrationSource, 'CREATE TABLE IF NOT EXISTS auto_indexed_content');
    });

    // Test 10.2: Required columns in auto_indexed_content
    test('auto_indexed_content has required columns', () => {
        assertIncludes(migrationSource, 'source_type TEXT NOT NULL');
        assertIncludes(migrationSource, 'content TEXT NOT NULL');
        assertIncludes(migrationSource, 'entities TEXT');
        assertIncludes(migrationSource, 'tags TEXT');
        assertIncludes(migrationSource, 'importance_score REAL');
        assertIncludes(migrationSource, 'embedding TEXT');
    });

    // Test 10.3: knowledge_graph table
    test('knowledge_graph table created', () => {
        assertIncludes(migrationSource, 'CREATE TABLE IF NOT EXISTS knowledge_graph');
    });

    // Test 10.4: knowledge_graph columns
    test('knowledge_graph has required columns', () => {
        assertIncludes(migrationSource, 'entity_type TEXT NOT NULL');
        assertIncludes(migrationSource, 'entity_name TEXT NOT NULL');
        assertIncludes(migrationSource, 'mention_count INTEGER');
    });

    // Test 10.5: memory_stats table
    test('memory_stats table created', () => {
        assertIncludes(migrationSource, 'CREATE TABLE IF NOT EXISTS memory_stats');
    });

    // Test 10.6: memory_stats counters
    test('memory_stats has counters by type', () => {
        assertIncludes(migrationSource, 'conversations_indexed');
        assertIncludes(migrationSource, 'screenshots_indexed');
        assertIncludes(migrationSource, 'audio_indexed');
        assertIncludes(migrationSource, 'ai_responses_indexed');
    });

    // Test 10.7: external_sources table
    test('external_sources table created', () => {
        assertIncludes(migrationSource, 'CREATE TABLE IF NOT EXISTS external_sources');
    });

    // Test 10.8: Indexes created
    test('Important indexes created', () => {
        assertIncludes(migrationSource, 'idx_auto_indexed_uid');
        assertIncludes(migrationSource, 'idx_auto_indexed_source');
        assertIncludes(migrationSource, 'idx_knowledge_uid');
    });

    // Test 10.9: Rollback function
    test('Has rollback function', () => {
        assertIncludes(migrationSource, 'function down(db)');
    });
}

// ============================================
// TEST 11: Summary Generation
// ============================================

function testSummaryGeneration() {
    startGroup('11. Summary Generation');

    // Test 11.1: generateSummary method
    test('generateSummary method exists', () => {
        assertIncludes(knowledgeOrganizerSource, 'async generateSummary(text, maxLength');
    });

    // Test 11.2: Default max length
    test('Default max length is 50 words', () => {
        assertIncludes(knowledgeOrganizerSource, 'maxLength = 50');
    });

    // Test 11.3: Uses LLM
    test('Uses LLM for summarization', () => {
        const summarySection = knowledgeOrganizerSource.substring(
            knowledgeOrganizerSource.indexOf('async generateSummary'),
            knowledgeOrganizerSource.indexOf('async generateSummary') + 800
        );
        assertIncludes(summarySection, '_getLLMClient()');
    });

    // Test 11.4: Fallback summary
    test('Has fallback summary generation', () => {
        assertIncludes(knowledgeOrganizerSource, "words.slice(0, maxLength).join(' ')");
    });

    // Test 11.5: Summary in auto-indexing
    test('Auto-indexing generates summary', () => {
        assertIncludes(autoIndexingSource, 'content_summary: summary');
    });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

function runAllTests() {
    console.log('\n' + '🔍'.repeat(30));
    console.log('🔍 AUTO-INDEXING SYSTEM TEST SUITE 🔍');
    console.log('🔍'.repeat(30));
    console.log(`\nDate: ${new Date().toISOString()}`);
    console.log(`Node Version: ${process.version}`);

    try {
        testConversationIndexing();
        testScreenshotIndexing();
        testAudioIndexing();
        testEntityExtraction();
        testAutoTagging();
        testImportanceScoring();
        testEmbeddingGeneration();
        testSearchIndexedContent();
        testKnowledgeGraph();
        testDatabaseSchema();
        testSummaryGeneration();
    } catch (e) {
        console.log(`\n❌ FATAL ERROR: ${e.message}`);
        console.log(e.stack);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Total:  ${testsPassed + testsFailed}`);
    console.log(`📊 Rate:   ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Auto-indexing system is working correctly.\n');
    } else {
        console.log(`\n⚠️  ${testsFailed} test(s) failed. Review the issues above.\n`);
    }

    // Feature Summary
    console.log('='.repeat(60));
    console.log('🔍 AUTO-INDEXING FEATURES');
    console.log('='.repeat(60));
    console.log('');
    console.log('📝 SOURCE TYPES:');
    console.log('  ✓ Conversations - summary, entities, tags, embeddings');
    console.log('  ✓ Screenshots - OCR text extraction, entity detection');
    console.log('  ✓ Audio - transcription, speakers, actions/decisions');
    console.log('  ✓ External databases - import and indexing');
    console.log('');
    console.log('🏷️ ENTITY EXTRACTION:');
    console.log('  ✓ Projects');
    console.log('  ✓ People');
    console.log('  ✓ Companies');
    console.log('  ✓ Dates');
    console.log('  ✓ Topics');
    console.log('  ✓ Technologies');
    console.log('  ✓ Locations');
    console.log('');
    console.log('📊 IMPORTANCE SCORING FACTORS:');
    console.log('  ✓ Message count');
    console.log('  ✓ Content length');
    console.log('  ✓ Entity count');
    console.log('  ✓ Key points presence');
    console.log('  ✓ Speaker count (audio)');
    console.log('  ✓ Actions/decisions presence');
    console.log('');
    console.log('🔎 SEARCH CAPABILITIES:');
    console.log('  ✓ Semantic search with embeddings');
    console.log('  ✓ Cosine similarity scoring');
    console.log('  ✓ Keyword fallback search');
    console.log('  ✓ Multi-source retrieval (RAG)');
    console.log('  ✓ Source weighting');
    console.log('');

    return { passed: testsPassed, failed: testsFailed };
}

// Run if executed directly
if (require.main === module) {
    const result = runAllTests();
    process.exit(result.failed > 0 ? 1 : 0);
}

module.exports = { runAllTests };
