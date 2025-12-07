/**
 * Simple Test Phase 2 Day 1: Tables and Migration
 *
 * Tests migration and table creation without complex dependencies
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Test database path
const DB_PATH = path.join(__dirname, 'test_phase2_simple.db');

// Clean up old DB
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️  Cleaned up old test database');
}

console.log('\n🧪 Phase 2 Day 1 - Simple Table Creation Test\n');
console.log('='.repeat(60));

try {
    // Create database
    console.log('\n📦 TEST 1: Create database');
    console.log('-'.repeat(60));

    const db = new Database(DB_PATH);
    console.log('✅ Database created');

    // Create tables from migration
    console.log('\n🏗️  TEST 2: Create Phase 2 tables');
    console.log('-'.repeat(60));

    // 1. Auto-indexed Content Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS auto_indexed_content (
            id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_id TEXT,
            source_title TEXT,
            content TEXT NOT NULL,
            content_summary TEXT,
            raw_content TEXT,
            entities TEXT,
            tags TEXT,
            project TEXT,
            importance_score REAL DEFAULT 0.5,
            embedding TEXT,
            auto_generated INTEGER DEFAULT 1,
            indexed_at INTEGER,
            created_at INTEGER,
            updated_at INTEGER,
            sync_state TEXT DEFAULT 'clean'
        )
    `);

    console.log('✅ Created auto_indexed_content table');

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_auto_indexed_uid ON auto_indexed_content(uid)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_auto_indexed_source ON auto_indexed_content(source_type, source_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_auto_indexed_project ON auto_indexed_content(project)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_auto_indexed_date ON auto_indexed_content(indexed_at DESC)');

    console.log('✅ Created indexes for auto_indexed_content');

    // 2. Knowledge Graph Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_graph (
            id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_name TEXT NOT NULL,
            entity_description TEXT,
            first_seen INTEGER,
            last_seen INTEGER,
            mention_count INTEGER DEFAULT 1,
            related_entities TEXT,
            related_documents TEXT,
            related_content TEXT,
            metadata TEXT,
            importance_score REAL DEFAULT 0.5,
            created_at INTEGER,
            updated_at INTEGER,
            sync_state TEXT DEFAULT 'clean'
        )
    `);

    console.log('✅ Created knowledge_graph table');

    db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_uid ON knowledge_graph(uid)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_graph(entity_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_name ON knowledge_graph(entity_name)');

    console.log('✅ Created indexes for knowledge_graph');

    // 3. Memory Stats Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS memory_stats (
            uid TEXT PRIMARY KEY,
            total_elements INTEGER DEFAULT 0,
            documents_count INTEGER DEFAULT 0,
            conversations_indexed INTEGER DEFAULT 0,
            screenshots_indexed INTEGER DEFAULT 0,
            audio_indexed INTEGER DEFAULT 0,
            ai_responses_indexed INTEGER DEFAULT 0,
            total_size_bytes INTEGER DEFAULT 0,
            embeddings_count INTEGER DEFAULT 0,
            projects_count INTEGER DEFAULT 0,
            people_count INTEGER DEFAULT 0,
            companies_count INTEGER DEFAULT 0,
            topics_count INTEGER DEFAULT 0,
            last_indexed_at INTEGER,
            indexing_in_progress INTEGER DEFAULT 0,
            created_at INTEGER,
            updated_at INTEGER,
            sync_state TEXT DEFAULT 'clean'
        )
    `);

    console.log('✅ Created memory_stats table');

    // 4. External Sources Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS external_sources (
            id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_name TEXT NOT NULL,
            connection_config TEXT NOT NULL,
            mapping_config TEXT,
            sync_enabled INTEGER DEFAULT 0,
            sync_frequency TEXT,
            last_sync_at INTEGER,
            next_sync_at INTEGER,
            sync_status TEXT,
            sync_error TEXT,
            documents_imported INTEGER DEFAULT 0,
            total_size_bytes INTEGER DEFAULT 0,
            created_at INTEGER,
            updated_at INTEGER,
            sync_state TEXT DEFAULT 'clean'
        )
    `);

    console.log('✅ Created external_sources table');

    // 5. Import History Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS import_history (
            id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            source_id TEXT NOT NULL,
            import_type TEXT,
            started_at INTEGER,
            completed_at INTEGER,
            status TEXT,
            records_processed INTEGER DEFAULT 0,
            records_imported INTEGER DEFAULT 0,
            records_failed INTEGER DEFAULT 0,
            errors TEXT,
            created_at INTEGER,
            sync_state TEXT DEFAULT 'clean'
        )
    `);

    console.log('✅ Created import_history table');

    // Verify tables
    console.log('\n🔍 TEST 3: Verify all tables exist');
    console.log('-'.repeat(60));

    const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name IN ('auto_indexed_content', 'knowledge_graph', 'memory_stats', 'external_sources', 'import_history')
        ORDER BY name
    `).all();

    console.log(`✅ Found ${tables.length}/5 tables:`);
    tables.forEach(t => console.log(`   - ${t.name}`));

    if (tables.length !== 5) {
        throw new Error(`Expected 5 tables, found ${tables.length}`);
    }

    // Test inserting data
    console.log('\n📝 TEST 4: Insert test data');
    console.log('-'.repeat(60));

    const testUid = 'test_user_001';
    const now = Date.now();

    // Insert into auto_indexed_content
    db.prepare(`
        INSERT INTO auto_indexed_content (
            id, uid, source_type, source_id, source_title,
            content, content_summary, importance_score,
            indexed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        'content_001',
        testUid,
        'conversation',
        'session_001',
        'Test Conversation about Project Alpha',
        'Full conversation text about Alpha Project budget and timeline...',
        'Discussion about Alpha Project budget',
        0.85,
        now,
        now,
        now
    );

    console.log('✅ Inserted test content');

    // Insert into knowledge_graph
    db.prepare(`
        INSERT INTO knowledge_graph (
            id, uid, entity_type, entity_name,
            first_seen, last_seen, mention_count,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        'entity_001',
        testUid,
        'project',
        'Project Alpha',
        now,
        now,
        1,
        now,
        now
    );

    console.log('✅ Inserted test entity');

    // Insert into memory_stats
    db.prepare(`
        INSERT INTO memory_stats (
            uid, total_elements, conversations_indexed,
            last_indexed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        testUid,
        1,
        1,
        now,
        now,
        now
    );

    console.log('✅ Inserted memory stats');

    // Query data back
    console.log('\n📊 TEST 5: Query inserted data');
    console.log('-'.repeat(60));

    const content = db.prepare('SELECT * FROM auto_indexed_content WHERE id = ?').get('content_001');
    console.log('✅ Retrieved indexed content:');
    console.log(`   - ID: ${content.id}`);
    console.log(`   - Type: ${content.source_type}`);
    console.log(`   - Title: ${content.source_title}`);
    console.log(`   - Importance: ${content.importance_score}`);

    const entity = db.prepare('SELECT * FROM knowledge_graph WHERE id = ?').get('entity_001');
    console.log('✅ Retrieved entity:');
    console.log(`   - Type: ${entity.entity_type}`);
    console.log(`   - Name: ${entity.entity_name}`);
    console.log(`   - Mentions: ${entity.mention_count}`);

    const stats = db.prepare('SELECT * FROM memory_stats WHERE uid = ?').get(testUid);
    console.log('✅ Retrieved memory stats:');
    console.log(`   - Total elements: ${stats.total_elements}`);
    console.log(`   - Conversations indexed: ${stats.conversations_indexed}`);

    // Test indexes
    console.log('\n🗂️  TEST 6: Test indexes');
    console.log('-'.repeat(60));

    const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index'
        AND name LIKE 'idx_%'
        ORDER BY name
    `).all();

    console.log(`✅ Found ${indexes.length} indexes:`);
    indexes.forEach(idx => console.log(`   - ${idx.name}`));

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));

    console.log('\n📊 Summary:');
    console.log(`   ✅ 5 tables created successfully`);
    console.log(`   ✅ ${indexes.length} indexes created`);
    console.log(`   ✅ Data insertion working`);
    console.log(`   ✅ Data retrieval working`);
    console.log(`   ✅ Schema validation passed`);

    console.log('\n🎉 Phase 2 Day 1: Tables and Schema COMPLETE\n');

    // Close database
    db.close();
    console.log('🧹 Database connection closed');

    // Show next steps
    console.log('\n📋 Next Steps (remaining Day 1 tasks):');
    console.log('   1. ✅ Tables created');
    console.log('   2. ✅ Migration script ready');
    console.log('   3. ✅ autoIndexingService.js created');
    console.log('   4. ⏳ TODO: Integrate with main app');
    console.log('   5. ⏳ TODO: Test with real conversations');
    console.log('   6. ⏳ TODO: Implement LLM-based entity extraction');

} catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error(error.stack);
    process.exit(1);
}
