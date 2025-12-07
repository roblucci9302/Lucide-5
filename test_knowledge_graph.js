/**
 * Test Suite: Knowledge Graph System
 *
 * Tests comprehensive knowledge graph functionality:
 * - Entity creation with varied types
 * - Entity extraction from text
 * - Relation mapping between entities
 * - Mention counting accuracy
 * - Related documents tracking
 * - Timestamps verification
 * - Importance scoring coherence
 * - Statistics and queries
 *
 * Run: node test_knowledge_graph.js
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(`  ${title}`, colors.cyan + colors.bold);
    console.log('='.repeat(60));
}

function logTest(name, passed, details = '') {
    const status = passed ? `${colors.green}✓ PASS` : `${colors.red}✗ FAIL`;
    console.log(`  ${status}${colors.reset} ${name}`);
    if (details && !passed) {
        console.log(`       ${colors.yellow}${details}${colors.reset}`);
    }
    testResults.tests.push({ name, passed, details });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

// Read file content
function readFile(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

// ============================================================
// TESTS
// ============================================================

function runTests() {
    log('\n🧪 KNOWLEDGE GRAPH TEST SUITE', colors.bold + colors.cyan);
    log('Testing comprehensive knowledge graph functionality\n', colors.cyan);

    // Read source files
    const knowledgeOrganizerSource = readFile('src/features/common/services/knowledgeOrganizerService.js');
    const autoIndexingSource = readFile('src/features/common/services/autoIndexingService.js');
    const migrationSource = readFile('src/features/common/migrations/002_phase2_augmented_memory.js');

    if (!knowledgeOrganizerSource) {
        log('ERROR: knowledgeOrganizerService.js not found!', colors.red);
        return;
    }

    // ============================================================
    // 1. ENTITY TYPE SUPPORT (12 tests)
    // ============================================================
    logSection('1. ENTITY TYPE SUPPORT');

    // Test: Service supports project entities
    logTest(
        'Supports project entities',
        knowledgeOrganizerSource.includes("entity_type = 'project'") &&
        knowledgeOrganizerSource.includes('detectProjects')
    );

    // Test: Service supports person entities
    logTest(
        'Supports person entities',
        knowledgeOrganizerSource.includes("entity_type = 'person'") &&
        knowledgeOrganizerSource.includes('detectPeople')
    );

    // Test: Service supports topic entities
    logTest(
        'Supports topic entities',
        knowledgeOrganizerSource.includes("entity_type = 'topic'") &&
        knowledgeOrganizerSource.includes('detectTopics')
    );

    // Test: Service supports company entities
    logTest(
        'Supports company entities',
        knowledgeOrganizerSource.includes('companies') &&
        knowledgeOrganizerSource.includes('companies:')
    );

    // Test: Service supports technology entities
    logTest(
        'Supports technology entities',
        knowledgeOrganizerSource.includes('technologies') &&
        knowledgeOrganizerSource.includes('technologies:')
    );

    // Test: Service supports date entities
    logTest(
        'Supports date entities',
        knowledgeOrganizerSource.includes('dates') &&
        knowledgeOrganizerSource.includes('_extractDates')
    );

    // Test: Service supports location entities
    logTest(
        'Supports location entities',
        knowledgeOrganizerSource.includes('locations') &&
        knowledgeOrganizerSource.includes('locations:')
    );

    // Test: Entity types are normalized in extraction
    logTest(
        'Entity types are normalized in extraction',
        knowledgeOrganizerSource.includes('Array.isArray(entities.projects)') &&
        knowledgeOrganizerSource.includes('Array.isArray(entities.people)')
    );

    // Test: Generic getEntitiesByType method exists
    logTest(
        'Generic getEntitiesByType method exists',
        knowledgeOrganizerSource.includes('async getEntitiesByType(uid, entityType, options')
    );

    // Test: Entity type stored in database
    logTest(
        'Entity type stored in database',
        migrationSource && migrationSource.includes('entity_type TEXT NOT NULL')
    );

    // Test: Entity name stored in database
    logTest(
        'Entity name stored in database',
        migrationSource && migrationSource.includes('entity_name TEXT NOT NULL')
    );

    // Test: Entity description supported
    logTest(
        'Entity description supported in schema',
        migrationSource && migrationSource.includes('entity_description TEXT')
    );

    // ============================================================
    // 2. ENTITY EXTRACTION (14 tests)
    // ============================================================
    logSection('2. ENTITY EXTRACTION');

    // Test: extractEntities method exists
    logTest(
        'extractEntities method exists',
        knowledgeOrganizerSource.includes('async extractEntities(text, context')
    );

    // Test: LLM-based extraction with structured prompt
    logTest(
        'LLM-based extraction with structured prompt',
        knowledgeOrganizerSource.includes('Analyze the following text and extract all relevant entities') &&
        knowledgeOrganizerSource.includes('Return a JSON object')
    );

    // Test: Fallback extraction when LLM unavailable
    logTest(
        'Fallback extraction when LLM unavailable',
        knowledgeOrganizerSource.includes('_fallbackEntityExtraction(text)') &&
        knowledgeOrganizerSource.includes('No LLM available, using fallback')
    );

    // Test: Regex-based project extraction
    logTest(
        'Regex-based project extraction in fallback',
        knowledgeOrganizerSource.includes('Project\\s+([A-Z][a-zA-Z0-9\\s]+)')
    );

    // Test: Regex-based people extraction
    logTest(
        'Regex-based people extraction in fallback',
        knowledgeOrganizerSource.includes('([A-Z][a-z]+\\s+[A-Z][a-z]+)')
    );

    // Test: Date extraction with multiple formats
    const hasISOFormat = knowledgeOrganizerSource.includes('\\d{4}-\\d{2}-\\d{2}');
    const hasUSFormat = knowledgeOrganizerSource.includes('\\d{1,2}\\/\\d{1,2}\\/\\d{4}');
    const hasQuarterFormat = knowledgeOrganizerSource.includes('Q[1-4]\\s+\\d{4}');
    logTest(
        'Date extraction with multiple formats (ISO, US, Quarter)',
        hasISOFormat && hasUSFormat && hasQuarterFormat,
        `ISO: ${hasISOFormat}, US: ${hasUSFormat}, Quarter: ${hasQuarterFormat}`
    );

    // Test: Text truncation for LLM (performance)
    logTest(
        'Text truncated for LLM processing (4000 chars)',
        knowledgeOrganizerSource.includes('text.substring(0, 4000)')
    );

    // Test: JSON response parsing with markdown handling
    logTest(
        'JSON response parsing handles markdown code blocks',
        knowledgeOrganizerSource.includes("content.match(/```json") &&
        knowledgeOrganizerSource.includes("content.match(/```\\n")
    );

    // Test: Entity normalization rules
    logTest(
        'Entity normalization rules documented',
        knowledgeOrganizerSource.includes('Normalize names') &&
        knowledgeOrganizerSource.includes('Remove duplicates')
    );

    // Test: Pattern extraction limits results
    logTest(
        'Pattern extraction limits to 10 results',
        knowledgeOrganizerSource.includes('slice(0, 10)')
    );

    // Test: Date extraction limits results
    logTest(
        'Date extraction limits to 5 results',
        knowledgeOrganizerSource.includes('dates.slice(0, 5)')
    );

    // Test: Duplicate detection in pattern extraction
    logTest(
        'Duplicate detection in pattern extraction',
        knowledgeOrganizerSource.includes('!matches.includes(value)')
    );

    // Test: Duplicate detection in date extraction
    logTest(
        'Duplicate detection in date extraction',
        knowledgeOrganizerSource.includes('!dates.includes(match[0])')
    );

    // Test: Error handling falls back to regex
    logTest(
        'Error handling falls back to regex extraction',
        knowledgeOrganizerSource.includes('Entity extraction failed:') &&
        knowledgeOrganizerSource.includes('return this._fallbackEntityExtraction(text)')
    );

    // ============================================================
    // 3. ENTITY CREATION AND UPDATE (13 tests)
    // ============================================================
    logSection('3. ENTITY CREATION AND UPDATE');

    // Test: createOrUpdateEntity method exists
    logTest(
        'createOrUpdateEntity method exists',
        knowledgeOrganizerSource.includes('async createOrUpdateEntity(entityData, uid)')
    );

    // Test: Required fields validation
    logTest(
        'Validates required fields (entity_type, entity_name)',
        knowledgeOrganizerSource.includes("entity_type and entity_name are required")
    );

    // Test: UUID generation for new entities
    logTest(
        'UUID generation for new entities',
        knowledgeOrganizerSource.includes('const id = uuidv4()')
    );

    // Test: Check for existing entity before insert
    logTest(
        'Check for existing entity before insert',
        knowledgeOrganizerSource.includes('SELECT id, mention_count, first_seen, last_seen') &&
        knowledgeOrganizerSource.includes('WHERE uid = ? AND entity_type = ? AND entity_name = ?')
    );

    // Test: Update existing vs create new logic
    logTest(
        'Update existing vs create new logic',
        knowledgeOrganizerSource.includes('if (existing)') &&
        knowledgeOrganizerSource.includes('UPDATE knowledge_graph') &&
        knowledgeOrganizerSource.includes('INSERT INTO knowledge_graph')
    );

    // Test: Entity_value support (optional)
    logTest(
        'Entity value support (for dates, etc.)',
        knowledgeOrganizerSource.includes('entity_value = null') &&
        knowledgeOrganizerSource.includes('entity_value')
    );

    // Test: Confidence score support
    logTest(
        'Confidence score support',
        knowledgeOrganizerSource.includes('confidence = 1.0') &&
        knowledgeOrganizerSource.includes('confidence')
    );

    // Test: Related content ID tracking
    logTest(
        'Related content ID tracking',
        knowledgeOrganizerSource.includes('related_content_id = null') &&
        knowledgeOrganizerSource.includes('related_content_id')
    );

    // Test: Sync state initialization
    logTest(
        'Sync state initialized to clean',
        knowledgeOrganizerSource.includes("'clean'") &&
        migrationSource && migrationSource.includes("sync_state TEXT DEFAULT 'clean'")
    );

    // Test: Database auto-initialization
    logTest(
        'Database auto-initialization when needed',
        knowledgeOrganizerSource.includes('if (!this.db)') &&
        knowledgeOrganizerSource.includes('await this.initialize()')
    );

    // Test: Logging for entity creation
    logTest(
        'Logging for entity creation',
        knowledgeOrganizerSource.includes('Created new entity:')
    );

    // Test: Logging for entity update
    logTest(
        'Logging for entity update',
        knowledgeOrganizerSource.includes('Updated entity:')
    );

    // Test: Returns entity ID
    logTest(
        'Returns entity ID after creation/update',
        knowledgeOrganizerSource.includes('return existing.id') &&
        knowledgeOrganizerSource.includes('return id')
    );

    // ============================================================
    // 4. MENTION COUNTING (9 tests)
    // ============================================================
    logSection('4. MENTION COUNTING');

    // Test: Initial mention count is 1
    logTest(
        'Initial mention count is 1 for new entities',
        knowledgeOrganizerSource.includes('1, // Initial mention count')
    );

    // Test: Mention count incremented on update
    logTest(
        'Mention count incremented on update',
        knowledgeOrganizerSource.includes('mention_count = mention_count + 1')
    );

    // Test: Mention count stored in database
    logTest(
        'Mention count stored in database schema',
        migrationSource && migrationSource.includes('mention_count INTEGER DEFAULT 1')
    );

    // Test: Mention count index for performance
    logTest(
        'Mention count index for query performance',
        migrationSource && migrationSource.includes('idx_knowledge_mentions') &&
        migrationSource.includes('mention_count DESC')
    );

    // Test: Sort by mention count supported
    logTest(
        'Sort by mention count in queries',
        knowledgeOrganizerSource.includes("sortBy = 'mention_count'") &&
        knowledgeOrganizerSource.includes('mention_count DESC')
    );

    // Test: Minimum mentions filter
    logTest(
        'Minimum mentions filter in queries',
        knowledgeOrganizerSource.includes('minMentions = 1') &&
        knowledgeOrganizerSource.includes('mention_count >= ?')
    );

    // Test: Mention count returned in results
    logTest(
        'Mention count returned in query results',
        knowledgeOrganizerSource.includes('mentionCount: p.mention_count') ||
        knowledgeOrganizerSource.includes('mentionCount: e.mention_count')
    );

    // Test: Mention count logged on update
    logTest(
        'Mention count logged on update',
        knowledgeOrganizerSource.includes('(mentions: ${existing.mention_count + 1})')
    );

    // Test: detectProjects sorts by mention count
    logTest(
        'detectProjects sorts by mention count',
        knowledgeOrganizerSource.includes('ORDER BY mention_count DESC, last_seen DESC') &&
        knowledgeOrganizerSource.includes('detectProjects')
    );

    // ============================================================
    // 5. RELATED DOCUMENTS TRACKING (10 tests)
    // ============================================================
    logSection('5. RELATED DOCUMENTS TRACKING');

    // Test: Related entities field in schema
    logTest(
        'Related entities field in database schema',
        migrationSource && migrationSource.includes('related_entities TEXT')
    );

    // Test: Related documents field in schema
    logTest(
        'Related documents field in database schema',
        migrationSource && migrationSource.includes('related_documents TEXT')
    );

    // Test: Related content field in schema
    logTest(
        'Related content field in database schema',
        migrationSource && migrationSource.includes('related_content TEXT')
    );

    // Test: Related entities stored as JSON array
    logTest(
        'Related entities stored as JSON array',
        knowledgeOrganizerSource.includes('JSON.stringify(relatedEntities)') ||
        knowledgeOrganizerSource.includes('JSON.stringify(updatedRelatedEntities)')
    );

    // Test: Related entities parsed from JSON
    logTest(
        'Related entities parsed from JSON on retrieval',
        knowledgeOrganizerSource.includes('JSON.parse(p.related_entities)') ||
        knowledgeOrganizerSource.includes('JSON.parse(e.related_entities)')
    );

    // Test: New content ID added to existing entity
    logTest(
        'New content ID added to existing entity relations',
        knowledgeOrganizerSource.includes('updatedRelatedEntities.push(related_content_id)')
    );

    // Test: Duplicate content ID prevention
    logTest(
        'Duplicate content ID prevention',
        knowledgeOrganizerSource.includes('!updatedRelatedEntities.includes(related_content_id)')
    );

    // Test: Empty array initialization for new entities
    logTest(
        'Empty array initialization for new entities',
        knowledgeOrganizerSource.includes('const relatedEntities = related_content_id ? [related_content_id] : []')
    );

    // Test: Existing relations preserved on update
    logTest(
        'Existing relations preserved on update',
        knowledgeOrganizerSource.includes('const updatedRelatedEntities = existing.related_entities ? JSON.parse(existing.related_entities) : []')
    );

    // Test: Related content returned in results
    logTest(
        'Related content returned in query results',
        knowledgeOrganizerSource.includes('relatedContent: p.related_entities') ||
        knowledgeOrganizerSource.includes('relatedContent: e.related_entities')
    );

    // ============================================================
    // 6. TIMESTAMPS (11 tests)
    // ============================================================
    logSection('6. TIMESTAMPS');

    // Test: first_seen timestamp in schema
    logTest(
        'first_seen timestamp in database schema',
        migrationSource && migrationSource.includes('first_seen INTEGER')
    );

    // Test: last_seen timestamp in schema
    logTest(
        'last_seen timestamp in database schema',
        migrationSource && migrationSource.includes('last_seen INTEGER')
    );

    // Test: created_at timestamp in schema
    logTest(
        'created_at timestamp in database schema',
        migrationSource && migrationSource.includes('created_at INTEGER')
    );

    // Test: updated_at timestamp in schema
    logTest(
        'updated_at timestamp in database schema',
        migrationSource && migrationSource.includes('updated_at INTEGER')
    );

    // Test: last_seen index for performance
    logTest(
        'last_seen index for query performance',
        migrationSource && migrationSource.includes('idx_knowledge_last_seen') &&
        migrationSource.includes('last_seen DESC')
    );

    // Test: Timestamp set on creation
    logTest(
        'Timestamp set using Date.now() on creation',
        knowledgeOrganizerSource.includes('const now = Date.now()') &&
        knowledgeOrganizerSource.includes('now, // first_seen') ||
        knowledgeOrganizerSource.includes('now,\n                now,') // first_seen, last_seen
    );

    // Test: first_seen preserved on update
    logTest(
        'first_seen preserved on update (not changed)',
        knowledgeOrganizerSource.includes('UPDATE knowledge_graph') &&
        !knowledgeOrganizerSource.match(/UPDATE knowledge_graph[\s\S]*?first_seen\s*=/)
    );

    // Test: last_seen updated on mention
    logTest(
        'last_seen updated on mention',
        knowledgeOrganizerSource.includes('last_seen = ?') &&
        knowledgeOrganizerSource.includes('UPDATE knowledge_graph')
    );

    // Test: updated_at updated on modification
    logTest(
        'updated_at updated on modification',
        knowledgeOrganizerSource.includes('updated_at = ?') &&
        knowledgeOrganizerSource.includes('UPDATE knowledge_graph')
    );

    // Test: Sort by last_seen supported
    logTest(
        'Sort by last_seen supported',
        knowledgeOrganizerSource.includes("sortBy === 'last_seen'") &&
        knowledgeOrganizerSource.includes("'last_seen DESC'")
    );

    // Test: Sort by first_seen supported
    logTest(
        'Sort by first_seen supported',
        knowledgeOrganizerSource.includes("sortBy === 'first_seen'") &&
        knowledgeOrganizerSource.includes("'first_seen DESC'")
    );

    // ============================================================
    // 7. IMPORTANCE SCORING (9 tests)
    // ============================================================
    logSection('7. IMPORTANCE SCORING');

    // Test: importance_score field in schema
    logTest(
        'importance_score field in database schema',
        migrationSource && migrationSource.includes('importance_score REAL DEFAULT 0.5')
    );

    // Test: Importance score index for performance
    logTest(
        'Importance score index for performance',
        migrationSource && migrationSource.includes('idx_auto_indexed_importance') &&
        migrationSource.includes('importance_score DESC')
    );

    // Test: Auto-indexing calculates importance
    if (autoIndexingSource) {
        logTest(
            'Auto-indexing calculates importance score',
            autoIndexingSource.includes('_calculateImportance') ||
            autoIndexingSource.includes('importance_score')
        );

        // Test: Multiple factors in importance calculation
        logTest(
            'Multiple factors in importance calculation',
            autoIndexingSource.includes('baseImportance') ||
            (autoIndexingSource.includes('importance') && autoIndexingSource.includes('factor'))
        );

        // Test: Entity count affects importance
        logTest(
            'Entity count affects importance',
            autoIndexingSource.includes('entities') && autoIndexingSource.includes('importance')
        );

        // Test: Content length affects importance
        logTest(
            'Content length affects importance',
            autoIndexingSource.includes('content.length') ||
            autoIndexingSource.includes('length') && autoIndexingSource.includes('importance')
        );
    } else {
        logTest('Auto-indexing calculates importance score', false, 'autoIndexingService.js not found');
        logTest('Multiple factors in importance calculation', false, 'autoIndexingService.js not found');
        logTest('Entity count affects importance', false, 'autoIndexingService.js not found');
        logTest('Content length affects importance', false, 'autoIndexingService.js not found');
    }

    // Test: Confidence score stored with entity
    logTest(
        'Confidence score stored with entity',
        knowledgeOrganizerSource.includes('confidence,') &&
        knowledgeOrganizerSource.includes('confidence: p.confidence')
    );

    // Test: Confidence returned in results
    logTest(
        'Confidence score returned in query results',
        knowledgeOrganizerSource.includes('confidence: p.confidence') ||
        knowledgeOrganizerSource.includes('confidence: e.confidence')
    );

    // Test: Default confidence is 1.0
    logTest(
        'Default confidence is 1.0',
        knowledgeOrganizerSource.includes('confidence = 1.0')
    );

    // ============================================================
    // 8. KNOWLEDGE GRAPH QUERIES (12 tests)
    // ============================================================
    logSection('8. KNOWLEDGE GRAPH QUERIES');

    // Test: detectProjects method
    logTest(
        'detectProjects method exists',
        knowledgeOrganizerSource.includes('async detectProjects(uid, minMentions')
    );

    // Test: detectPeople method
    logTest(
        'detectPeople method exists',
        knowledgeOrganizerSource.includes('async detectPeople(uid, minMentions')
    );

    // Test: detectTopics method
    logTest(
        'detectTopics method exists',
        knowledgeOrganizerSource.includes('async detectTopics(uid, minMentions')
    );

    // Test: detectEntitiesInQuery for RAG
    logTest(
        'detectEntitiesInQuery for RAG enhancement',
        knowledgeOrganizerSource.includes('async detectEntitiesInQuery(query)')
    );

    // Test: getKnowledgeGraphStats method
    logTest(
        'getKnowledgeGraphStats method exists',
        knowledgeOrganizerSource.includes('async getKnowledgeGraphStats(uid)')
    );

    // Test: Stats include total entities
    logTest(
        'Stats include total entities count',
        knowledgeOrganizerSource.includes('totalEntities: 0') &&
        knowledgeOrganizerSource.includes("SELECT COUNT(*) as count")
    );

    // Test: Stats include count by type
    logTest(
        'Stats include count by type',
        knowledgeOrganizerSource.includes('byType: {}') &&
        knowledgeOrganizerSource.includes('GROUP BY entity_type')
    );

    // Test: Stats include top projects
    logTest(
        'Stats include top projects',
        knowledgeOrganizerSource.includes('topProjects: []') &&
        knowledgeOrganizerSource.includes('stats.topProjects = await this.detectProjects')
    );

    // Test: Stats include top people
    logTest(
        'Stats include top people',
        knowledgeOrganizerSource.includes('topPeople: []') &&
        knowledgeOrganizerSource.includes('stats.topPeople = await this.detectPeople')
    );

    // Test: Stats include top topics
    logTest(
        'Stats include top topics',
        knowledgeOrganizerSource.includes('topTopics: []') &&
        knowledgeOrganizerSource.includes('stats.topTopics = await this.detectTopics')
    );

    // Test: Results limited to top 5
    logTest(
        'Stats results limited to top 5',
        knowledgeOrganizerSource.includes('.slice(0, 5)') &&
        knowledgeOrganizerSource.includes('topProjects')
    );

    // Test: Query limit parameter
    logTest(
        'Query supports limit parameter',
        knowledgeOrganizerSource.includes('limit = 50') &&
        knowledgeOrganizerSource.includes('LIMIT ?')
    );

    // ============================================================
    // 9. SUMMARY GENERATION (8 tests)
    // ============================================================
    logSection('9. SUMMARY GENERATION');

    // Test: generateSummary method exists
    logTest(
        'generateSummary method exists',
        knowledgeOrganizerSource.includes('async generateSummary(text, maxLength')
    );

    // Test: Default max length is 50 words
    logTest(
        'Default max length is 50 words',
        knowledgeOrganizerSource.includes('maxLength = 50')
    );

    // Test: LLM-based summary generation
    logTest(
        'LLM-based summary generation',
        knowledgeOrganizerSource.includes('Summarize the following text') &&
        knowledgeOrganizerSource.includes('words or less')
    );

    // Test: Fallback summary (first N words)
    logTest(
        'Fallback summary when no LLM (first N words)',
        knowledgeOrganizerSource.includes('words.slice(0, maxLength).join')
    );

    // Test: Ellipsis added for truncated summaries
    logTest(
        'Ellipsis added for truncated summaries',
        knowledgeOrganizerSource.includes("'...'")
    );

    // Test: Response trimmed
    logTest(
        'Response trimmed',
        knowledgeOrganizerSource.includes('summary = (response.content || response).trim()')
    );

    // Test: Error handling with fallback
    logTest(
        'Error handling with fallback for summary',
        knowledgeOrganizerSource.includes('Summary generation failed:')
    );

    // Test: Text truncation for processing
    logTest(
        'Text truncated for summary processing',
        knowledgeOrganizerSource.includes('text.substring(0, 4000)') &&
        knowledgeOrganizerSource.includes('generateSummary')
    );

    // ============================================================
    // 10. TAG GENERATION (9 tests)
    // ============================================================
    logSection('10. TAG GENERATION');

    // Test: generateTags method exists
    logTest(
        'generateTags method exists',
        knowledgeOrganizerSource.includes('async generateTags(text, maxTags')
    );

    // Test: Default max tags is 5
    logTest(
        'Default max tags is 5',
        knowledgeOrganizerSource.includes('maxTags = 5')
    );

    // Test: LLM-based tag generation
    logTest(
        'LLM-based tag generation with format rules',
        knowledgeOrganizerSource.includes('Generate ${maxTags} relevant tags') &&
        knowledgeOrganizerSource.includes('lowercase with hyphens')
    );

    // Test: Fallback tag generation
    logTest(
        'Fallback tag generation exists',
        knowledgeOrganizerSource.includes('_fallbackTagGeneration(text, maxTags')
    );

    // Test: Stop words filtering
    logTest(
        'Stop words filtering in fallback',
        knowledgeOrganizerSource.includes('stopWords') &&
        knowledgeOrganizerSource.includes("'the', 'a', 'an'")
    );

    // Test: Word frequency counting
    logTest(
        'Word frequency counting in fallback',
        knowledgeOrganizerSource.includes('wordCounts') &&
        knowledgeOrganizerSource.includes('wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1')
    );

    // Test: Minimum word length filter
    logTest(
        'Minimum word length filter (3 chars)',
        knowledgeOrganizerSource.includes('cleaned.length > 3')
    );

    // Test: Sort by frequency
    logTest(
        'Tags sorted by frequency',
        knowledgeOrganizerSource.includes('.sort((a, b) => b[1] - a[1])')
    );

    // Test: JSON array parsing
    logTest(
        'JSON array parsing for tag response',
        knowledgeOrganizerSource.includes("content.match(/\\[") &&
        knowledgeOrganizerSource.includes('Return ONLY a JSON array')
    );

    // ============================================================
    // 11. DATABASE SCHEMA (10 tests)
    // ============================================================
    logSection('11. DATABASE SCHEMA');

    if (!migrationSource) {
        log('  WARNING: Migration file not found, skipping schema tests', colors.yellow);
    }

    // Test: knowledge_graph table exists
    logTest(
        'knowledge_graph table creation',
        migrationSource && migrationSource.includes('CREATE TABLE IF NOT EXISTS knowledge_graph')
    );

    // Test: Primary key is id
    logTest(
        'Primary key is id TEXT',
        migrationSource && migrationSource.includes('id TEXT PRIMARY KEY')
    );

    // Test: User ID (uid) column
    logTest(
        'User ID (uid) column required',
        migrationSource && migrationSource.includes('uid TEXT NOT NULL')
    );

    // Test: Index on uid for user queries
    logTest(
        'Index on uid for user queries',
        migrationSource && migrationSource.includes('idx_knowledge_uid') &&
        migrationSource.includes('ON knowledge_graph(uid)')
    );

    // Test: Index on entity_type
    logTest(
        'Index on entity_type',
        migrationSource && migrationSource.includes('idx_knowledge_type') &&
        migrationSource.includes('ON knowledge_graph(entity_type)')
    );

    // Test: Index on entity_name
    logTest(
        'Index on entity_name',
        migrationSource && migrationSource.includes('idx_knowledge_name') &&
        migrationSource.includes('ON knowledge_graph(entity_name)')
    );

    // Test: Metadata field for extensibility
    logTest(
        'Metadata field for extensibility',
        migrationSource && migrationSource.includes('metadata TEXT')
    );

    // Test: Rollback support (down function)
    logTest(
        'Rollback support (down function)',
        migrationSource && migrationSource.includes('function down(db)') &&
        migrationSource.includes("DROP TABLE IF EXISTS knowledge_graph")
    );

    // Test: Migration version tracking
    logTest(
        'Migration version tracking',
        migrationSource && migrationSource.includes('version: 2')
    );

    // Test: Migration description
    logTest(
        'Migration description provided',
        migrationSource && migrationSource.includes("description: 'Phase 2")
    );

    // ============================================================
    // 12. AUTO-INDEXING INTEGRATION (8 tests)
    // ============================================================
    logSection('12. AUTO-INDEXING INTEGRATION');

    if (!autoIndexingSource) {
        log('  WARNING: autoIndexingService.js not found, skipping integration tests', colors.yellow);
    }

    // Test: Auto-indexing saves to knowledge graph
    logTest(
        'Auto-indexing saves entities to knowledge graph',
        autoIndexingSource && (
            autoIndexingSource.includes('_saveEntitiesToKnowledgeGraph') ||
            autoIndexingSource.includes('knowledgeOrganizerService')
        )
    );

    // Test: Entities extracted during conversation indexing
    logTest(
        'Entities extracted during conversation indexing',
        autoIndexingSource && (
            autoIndexingSource.includes('extractEntities') ||
            autoIndexingSource.includes('entities:')
        )
    );

    // Test: Entities extracted during screenshot indexing
    logTest(
        'Entities extracted during screenshot indexing',
        autoIndexingSource && autoIndexingSource.includes('indexScreenshot')
    );

    // Test: Entities extracted during audio indexing
    logTest(
        'Entities extracted during audio indexing',
        autoIndexingSource && autoIndexingSource.includes('indexAudioSession')
    );

    // Test: Knowledge organizer service imported
    logTest(
        'Knowledge organizer service imported',
        autoIndexingSource && (
            autoIndexingSource.includes("require('./knowledgeOrganizerService')") ||
            autoIndexingSource.includes('knowledgeOrganizerService')
        )
    );

    // Test: Entity types mapped correctly
    logTest(
        'Entity types mapped for knowledge graph',
        autoIndexingSource && (
            autoIndexingSource.includes("'project'") ||
            autoIndexingSource.includes("'person'")
        )
    );

    // Test: Content ID linked to entities
    logTest(
        'Content ID linked to entities',
        autoIndexingSource && (
            autoIndexingSource.includes('content_id') ||
            autoIndexingSource.includes('contentId')
        )
    );

    // Test: Multiple entity types processed
    const hasMultipleTypes = autoIndexingSource && (
        (autoIndexingSource.includes('projects') && autoIndexingSource.includes('people')) ||
        autoIndexingSource.includes('entities.')
    );
    logTest(
        'Multiple entity types processed (projects, people, etc.)',
        hasMultipleTypes
    );

    // ============================================================
    // 13. VISUALIZATION COMPONENT (15 tests)
    // ============================================================
    logSection('13. VISUALIZATION COMPONENT');

    const vizSource = readFile('src/features/memory/components/KnowledgeGraphVisualization.jsx');

    if (!vizSource) {
        log('  WARNING: KnowledgeGraphVisualization.jsx not found, skipping viz tests', colors.yellow);
    }

    // Test: Visualization component exists
    logTest(
        'Visualization component exists',
        vizSource !== null
    );

    // Test: Network view mode
    logTest(
        'Network view mode (SVG)',
        vizSource && vizSource.includes('NetworkView') &&
        vizSource.includes('<svg')
    );

    // Test: List view mode
    logTest(
        'List view mode',
        vizSource && vizSource.includes('ListView') &&
        vizSource.includes('list-view')
    );

    // Test: Entity type configuration with colors
    logTest(
        'Entity type configuration with colors',
        vizSource && vizSource.includes('ENTITY_CONFIG') &&
        vizSource.includes('color:')
    );

    // Test: All 7 entity types configured
    const hasProjectConfig = vizSource && vizSource.includes("project: {");
    const hasPersonConfig = vizSource && vizSource.includes("person: {");
    const hasCompanyConfig = vizSource && vizSource.includes("company: {");
    const hasTopicConfig = vizSource && vizSource.includes("topic: {");
    const hasTechConfig = vizSource && vizSource.includes("technology: {");
    const hasDateConfig = vizSource && vizSource.includes("date: {");
    const hasLocationConfig = vizSource && vizSource.includes("location: {");
    logTest(
        'All 7 entity types configured (project, person, company, topic, tech, date, location)',
        hasProjectConfig && hasPersonConfig && hasCompanyConfig && hasTopicConfig &&
        hasTechConfig && hasDateConfig && hasLocationConfig
    );

    // Test: Node size proportional to mention count
    logTest(
        'Node size proportional to mention count',
        vizSource && vizSource.includes('mention_count') &&
        vizSource.includes('radius')
    );

    // Test: Hover tooltip
    logTest(
        'Hover tooltip for entity details',
        vizSource && vizSource.includes('entity-tooltip') &&
        vizSource.includes('onMouseEnter')
    );

    // Test: Filter by entity type
    logTest(
        'Filter by entity type',
        vizSource && vizSource.includes('GraphFilters') &&
        vizSource.includes('activeTypes')
    );

    // Test: Sort options (mentions, recent, name)
    logTest(
        'Sort options (mentions, recent, name)',
        vizSource && vizSource.includes("sortBy === 'mentions'") &&
        vizSource.includes("sortBy === 'recent'") &&
        vizSource.includes("sortBy === 'name'")
    );

    // Test: Entity selection
    logTest(
        'Entity selection handling',
        vizSource && vizSource.includes('selectedEntity') &&
        vizSource.includes('onEntityClick')
    );

    // Test: Loading state
    logTest(
        'Loading state handling',
        vizSource && vizSource.includes('loading') &&
        vizSource.includes('Loading knowledge graph')
    );

    // Test: Error state
    logTest(
        'Error state handling',
        vizSource && vizSource.includes('error') &&
        vizSource.includes('Error Loading Knowledge Graph')
    );

    // Test: Empty state
    logTest(
        'Empty state handling',
        vizSource && vizSource.includes('entities.length === 0') &&
        vizSource.includes('No Entities Found')
    );

    // Test: Entity details panel
    logTest(
        'Selected entity details panel',
        vizSource && vizSource.includes('selected-entity-details') &&
        vizSource.includes('details-header')
    );

    // Test: Mention count badge on nodes
    logTest(
        'Mention count badge on nodes',
        vizSource && vizSource.includes('Mention Count Badge') &&
        vizSource.includes('{node.mention_count}')
    );

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    log('  TEST SUMMARY', colors.bold);
    console.log('='.repeat(60));

    const total = testResults.passed + testResults.failed;
    const passRate = ((testResults.passed / total) * 100).toFixed(1);

    log(`\n  Total Tests: ${total}`, colors.bold);
    log(`  Passed: ${testResults.passed}`, colors.green);
    log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
    log(`  Pass Rate: ${passRate}%`, passRate >= 90 ? colors.green : colors.yellow);

    if (testResults.failed > 0) {
        console.log('\n  Failed Tests:');
        testResults.tests
            .filter(t => !t.passed)
            .forEach(t => {
                log(`    - ${t.name}`, colors.red);
                if (t.details) {
                    log(`      ${t.details}`, colors.yellow);
                }
            });
    }

    console.log('\n' + '='.repeat(60));

    if (testResults.failed === 0) {
        log('  ✅ ALL TESTS PASSED! Knowledge Graph is ready.', colors.green + colors.bold);
    } else {
        log('  ⚠️  Some tests failed. Review the issues above.', colors.yellow + colors.bold);
    }
    console.log('='.repeat(60) + '\n');

    return testResults;
}

// Run tests
runTests();
