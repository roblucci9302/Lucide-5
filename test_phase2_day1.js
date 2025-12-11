/**
 * Test Phase 2 Day 1: Auto-Indexing Service
 *
 * Tests:
 * 1. Migration creates tables correctly
 * 2. Auto-indexing service initializes
 * 3. Conversation indexing works
 * 4. Memory stats are updated
 */

const path = require('path');
const fs = require('fs');

// Setup paths
const DB_PATH = path.join(__dirname, 'test_phase2.db');

// Clean up old test DB
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️  Cleaned up old test database');
}

// Set test database path
process.env.SQLITE_DB_PATH = DB_PATH;

const sqliteClient = require('./src/features/common/services/sqliteClient');
const autoIndexingService = require('./src/features/common/services/autoIndexingService');
const migration002 = require('./src/features/common/migrations/002_phase2_augmented_memory');

async function runTests() {
    console.log('\n🧪 Phase 2 Day 1 - Auto-Indexing Service Tests\n');
    console.log('='.repeat(60));

    try {
        // TEST 1: Initialize database
        console.log('\n📦 TEST 1: Initialize database and run migration');
        console.log('-'.repeat(60));

        const db = sqliteClient.getDatabase();
        console.log('✅ Database initialized');

        // Run migration
        migration002.up(db);
        console.log('✅ Migration 002 completed');

        // Verify tables exist
        const tables = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type='table'
            AND name IN ('auto_indexed_content', 'knowledge_graph', 'memory_stats', 'external_sources', 'import_history')
        `).all();

        console.log(`✅ Created ${tables.length}/5 tables:`);
        tables.forEach(t => console.log(`   - ${t.name}`));

        if (tables.length !== 5) {
            throw new Error('Not all tables were created!');
        }

        // TEST 2: Create test data
        console.log('\n📝 TEST 2: Create test session with messages');
        console.log('-'.repeat(60));

        const testUid = 'test_user_001';
        const testSessionId = 'session_test_001';
        const now = Math.floor(Date.now() / 1000);

        // Create test session
        db.prepare(`
            INSERT INTO sessions (id, uid, title, session_type, started_at, updated_at, sync_state)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(testSessionId, testUid, 'Test Conversation', 'ask', now, now, 'clean');

        // Create test messages
        const messages = [
            { role: 'user', content: 'Tell me about the Alpha Project budget' },
            { role: 'assistant', content: 'The Alpha Project has a budget of $500,000 allocated for Q4 2025. The main expenses include development ($300k), marketing ($150k), and operations ($50k). Key stakeholders are Marie Dupont (CFO) and Jean Martin (PM).' },
            { role: 'user', content: 'What are the main risks?' },
            { role: 'assistant', content: 'The main risks for Alpha Project are: 1) Budget overrun due to scope creep, 2) Timeline delays with Q4 deadline, 3) Resource constraints in the development team. Marie Dupont mentioned these concerns in the last board meeting.' }
        ];

        messages.forEach((msg, index) => {
            db.prepare(`
                INSERT INTO ai_messages (id, session_id, sent_at, role, content, tokens, model, created_at, sync_state)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                `msg_${index}`,
                testSessionId,
                now + index,
                msg.role,
                msg.content,
                100,
                'test-model',
                now + index,
                'clean'
            );
        });

        console.log(`✅ Created test session with ${messages.length} messages`);

        // TEST 3: Initialize auto-indexing service
        console.log('\n🤖 TEST 3: Initialize auto-indexing service');
        console.log('-'.repeat(60));

        await autoIndexingService.initialize();
        console.log('✅ Auto-indexing service initialized');

        // TEST 4: Index the conversation
        console.log('\n🔍 TEST 4: Index test conversation');
        console.log('-'.repeat(60));

        const result = await autoIndexingService.indexConversation(testSessionId, testUid);

        console.log('Indexing result:');
        console.log(JSON.stringify(result, null, 2));

        if (!result.indexed) {
            throw new Error(`Indexing failed: ${result.reason}`);
        }

        console.log('✅ Conversation indexed successfully');
        console.log(`   - Content ID: ${result.content_id}`);
        console.log(`   - Importance Score: ${result.importance_score}`);
        console.log(`   - Key Points: ${result.key_points_count}`);

        // TEST 5: Verify indexed content in database
        console.log('\n📊 TEST 5: Verify indexed content in database');
        console.log('-'.repeat(60));

        const indexedContent = db.prepare(`
            SELECT * FROM auto_indexed_content WHERE id = ?
        `).get(result.content_id);

        if (!indexedContent) {
            throw new Error('Indexed content not found in database!');
        }

        console.log('✅ Indexed content found in database:');
        console.log(`   - Source Type: ${indexedContent.source_type}`);
        console.log(`   - Source ID: ${indexedContent.source_id}`);
        console.log(`   - Title: ${indexedContent.source_title}`);
        console.log(`   - Content Length: ${indexedContent.content.length} chars`);
        console.log(`   - Summary: ${indexedContent.content_summary?.substring(0, 80)}...`);
        console.log(`   - Project: ${indexedContent.project || 'None'}`);
        console.log(`   - Importance: ${indexedContent.importance_score}`);
        console.log(`   - Has Embedding: ${indexedContent.embedding ? 'Yes' : 'No'}`);

        // Parse JSON fields
        const entities = indexedContent.entities ? JSON.parse(indexedContent.entities) : {};
        const tags = indexedContent.tags ? JSON.parse(indexedContent.tags) : [];

        console.log(`   - Entities: ${JSON.stringify(entities)}`);
        console.log(`   - Tags: ${JSON.stringify(tags)}`);

        // TEST 6: Verify memory stats
        console.log('\n📈 TEST 6: Verify memory statistics');
        console.log('-'.repeat(60));

        const memoryStats = db.prepare(`
            SELECT * FROM memory_stats WHERE uid = ?
        `).get(testUid);

        if (!memoryStats) {
            throw new Error('Memory stats not found!');
        }

        console.log('✅ Memory stats updated:');
        console.log(`   - Total Elements: ${memoryStats.total_elements}`);
        console.log(`   - Conversations Indexed: ${memoryStats.conversations_indexed}`);
        console.log(`   - Screenshots Indexed: ${memoryStats.screenshots_indexed}`);
        console.log(`   - Audio Indexed: ${memoryStats.audio_indexed}`);
        console.log(`   - Last Indexed: ${new Date(memoryStats.last_indexed_at).toISOString()}`);

        if (memoryStats.total_elements !== 1 || memoryStats.conversations_indexed !== 1) {
            throw new Error('Memory stats not correctly updated!');
        }

        // TEST 7: Test shouldIndexConversation
        console.log('\n🎯 TEST 7: Test shouldIndexConversation filter');
        console.log('-'.repeat(60));

        const shouldIndex = await autoIndexingService.shouldIndexConversation(testSessionId);
        console.log(`✅ Should index conversation: ${shouldIndex}`);

        if (!shouldIndex) {
            throw new Error('shouldIndexConversation returned false for valid session');
        }

        // Create session with too few messages
        const shortSessionId = 'session_short';
        db.prepare(`
            INSERT INTO sessions (id, uid, title, session_type, started_at, updated_at, sync_state)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(shortSessionId, testUid, 'Short Conversation', 'ask', now, now, 'clean');

        db.prepare(`
            INSERT INTO ai_messages (id, session_id, sent_at, role, content, tokens, model, created_at, sync_state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('msg_short', shortSessionId, now, 'user', 'Hi', 10, 'test', now, 'clean');

        const shouldNotIndex = await autoIndexingService.shouldIndexConversation(shortSessionId);
        console.log(`✅ Should not index short conversation: ${!shouldNotIndex}`);

        if (shouldNotIndex) {
            throw new Error('shouldIndexConversation returned true for short session');
        }

        // TEST 8: Query indexed content
        console.log('\n🔎 TEST 8: Query indexed content');
        console.log('-'.repeat(60));

        const allIndexed = db.prepare(`
            SELECT
                source_type,
                source_title,
                LENGTH(content) as content_length,
                importance_score,
                indexed_at
            FROM auto_indexed_content
            WHERE uid = ?
            ORDER BY indexed_at DESC
        `).all(testUid);

        console.log(`✅ Found ${allIndexed.length} indexed items for user:`);
        allIndexed.forEach((item, index) => {
            console.log(`   ${index + 1}. [${item.source_type}] ${item.source_title}`);
            console.log(`      - Content: ${item.content_length} chars`);
            console.log(`      - Importance: ${item.importance_score}`);
            console.log(`      - Indexed: ${new Date(item.indexed_at).toISOString()}`);
        });

        // FINAL RESULTS
        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL TESTS PASSED!');
        console.log('='.repeat(60));

        console.log('\n📊 Summary:');
        console.log(`   ✅ Migration: 5 tables created`);
        console.log(`   ✅ Auto-indexing service: Initialized`);
        console.log(`   ✅ Conversation indexing: Working`);
        console.log(`   ✅ Memory stats: Updated correctly`);
        console.log(`   ✅ Filtering: Working (shouldIndex)`);
        console.log(`   ✅ Query: Can retrieve indexed content`);

        console.log('\n🎉 Phase 2 Day 1: COMPLETE\n');

        // Cleanup
        db.close();
        console.log('🧹 Database connection closed');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
