/**
 * Migration 002: Phase 2 - Augmented Memory Tables
 *
 * Creates tables for auto-indexing, knowledge graph, memory stats,
 * and external data sources integration.
 */

const logger = require('../utils/logger');

/**
 * Apply migration: Create Phase 2 tables and indexes
 * @param {Database} db - SQLite database instance
 */
function up(db) {
    logger.info('[Migration 002] Creating Phase 2: Augmented Memory tables...');

    try {
        // 1. Auto-indexed Content Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS auto_indexed_content (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                -- Source info
                source_type TEXT NOT NULL,
                source_id TEXT,
                source_title TEXT,
                -- Content
                content TEXT NOT NULL,
                content_summary TEXT,
                raw_content TEXT,
                -- Metadata
                entities TEXT,
                tags TEXT,
                project TEXT,
                importance_score REAL DEFAULT 0.5,
                -- Embedding for semantic search
                embedding TEXT,
                -- Organization
                auto_generated INTEGER DEFAULT 1,
                indexed_at INTEGER,
                created_at INTEGER,
                updated_at INTEGER,
                sync_state TEXT DEFAULT 'clean'
            )
        `);

        // Indexes for auto_indexed_content
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_auto_indexed_uid
            ON auto_indexed_content(uid);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_auto_indexed_source
            ON auto_indexed_content(source_type, source_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_auto_indexed_project
            ON auto_indexed_content(project);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_auto_indexed_date
            ON auto_indexed_content(indexed_at DESC);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_auto_indexed_importance
            ON auto_indexed_content(importance_score DESC);
        `);

        logger.info('[Migration 002] ✅ auto_indexed_content table created');

        // 2. Knowledge Graph Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_graph (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                -- Entity
                entity_type TEXT NOT NULL,
                entity_name TEXT NOT NULL,
                entity_description TEXT,
                -- Statistics
                first_seen INTEGER,
                last_seen INTEGER,
                mention_count INTEGER DEFAULT 1,
                -- Relations
                related_entities TEXT,
                related_documents TEXT,
                related_content TEXT,
                -- Metadata
                metadata TEXT,
                importance_score REAL DEFAULT 0.5,
                created_at INTEGER,
                updated_at INTEGER,
                sync_state TEXT DEFAULT 'clean'
            )
        `);

        // Indexes for knowledge_graph
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_knowledge_uid
            ON knowledge_graph(uid);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_knowledge_type
            ON knowledge_graph(entity_type);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_knowledge_name
            ON knowledge_graph(entity_name);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_knowledge_mentions
            ON knowledge_graph(mention_count DESC);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_knowledge_last_seen
            ON knowledge_graph(last_seen DESC);
        `);

        logger.info('[Migration 002] ✅ knowledge_graph table created');

        // 3. Memory Statistics Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS memory_stats (
                uid TEXT PRIMARY KEY,
                -- Counters by type
                total_elements INTEGER DEFAULT 0,
                documents_count INTEGER DEFAULT 0,
                conversations_indexed INTEGER DEFAULT 0,
                screenshots_indexed INTEGER DEFAULT 0,
                audio_indexed INTEGER DEFAULT 0,
                ai_responses_indexed INTEGER DEFAULT 0,
                -- Size
                total_size_bytes INTEGER DEFAULT 0,
                embeddings_count INTEGER DEFAULT 0,
                -- Entities
                projects_count INTEGER DEFAULT 0,
                people_count INTEGER DEFAULT 0,
                companies_count INTEGER DEFAULT 0,
                topics_count INTEGER DEFAULT 0,
                -- Activity
                last_indexed_at INTEGER,
                indexing_in_progress INTEGER DEFAULT 0,
                -- Metadata
                created_at INTEGER,
                updated_at INTEGER,
                sync_state TEXT DEFAULT 'clean'
            )
        `);

        logger.info('[Migration 002] ✅ memory_stats table created');

        // 4. External Sources Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS external_sources (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                -- Source type
                source_type TEXT NOT NULL,
                source_name TEXT NOT NULL,
                -- Connection config (encrypted)
                connection_config TEXT NOT NULL,
                -- Mapping
                mapping_config TEXT,
                -- Synchronization
                sync_enabled INTEGER DEFAULT 0,
                sync_frequency TEXT,
                last_sync_at INTEGER,
                next_sync_at INTEGER,
                sync_status TEXT,
                sync_error TEXT,
                -- Statistics
                documents_imported INTEGER DEFAULT 0,
                total_size_bytes INTEGER DEFAULT 0,
                -- Metadata
                created_at INTEGER,
                updated_at INTEGER,
                sync_state TEXT DEFAULT 'clean'
            )
        `);

        // Indexes for external_sources
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_external_sources_uid
            ON external_sources(uid);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_external_sources_type
            ON external_sources(source_type);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_external_sources_status
            ON external_sources(sync_status);
        `);

        logger.info('[Migration 002] ✅ external_sources table created');

        // 5. Import History Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS import_history (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                source_id TEXT NOT NULL,
                -- Import info
                import_type TEXT,
                started_at INTEGER,
                completed_at INTEGER,
                status TEXT,
                -- Results
                records_processed INTEGER DEFAULT 0,
                records_imported INTEGER DEFAULT 0,
                records_failed INTEGER DEFAULT 0,
                errors TEXT,
                -- Metadata
                created_at INTEGER,
                sync_state TEXT DEFAULT 'clean'
            )
        `);

        // Indexes for import_history
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_import_history_uid
            ON import_history(uid);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_import_history_source
            ON import_history(source_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_import_history_date
            ON import_history(started_at DESC);
        `);

        logger.info('[Migration 002] ✅ import_history table created');

        logger.info('[Migration 002] ✅ All Phase 2 tables and indexes created successfully');

        return true;
    } catch (error) {
        logger.error('[Migration 002] ❌ Error creating tables:', error);
        throw error;
    }
}

/**
 * Rollback migration: Drop Phase 2 tables
 * @param {Database} db - SQLite database instance
 */
function down(db) {
    logger.info('[Migration 002] Rolling back Phase 2 tables...');

    try {
        db.exec('DROP TABLE IF EXISTS import_history');
        db.exec('DROP TABLE IF EXISTS external_sources');
        db.exec('DROP TABLE IF EXISTS memory_stats');
        db.exec('DROP TABLE IF EXISTS knowledge_graph');
        db.exec('DROP TABLE IF EXISTS auto_indexed_content');

        logger.info('[Migration 002] ✅ Phase 2 tables dropped');

        return true;
    } catch (error) {
        logger.error('[Migration 002] ❌ Error dropping tables:', error);
        throw error;
    }
}

module.exports = {
    up,
    down,
    version: 2,
    description: 'Phase 2: Augmented Memory - Auto-indexing, Knowledge Graph, External Sources'
};
