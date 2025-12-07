-- =====================================================
-- Lucidi Test Database - PostgreSQL Initialization
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- External Data Sources Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_external_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255),
    connection_config JSONB NOT NULL,
    credentials_encrypted BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- External Data Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_external_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES test_external_sources(id) ON DELETE CASCADE,
    data_type VARCHAR(100),
    content TEXT,
    metadata JSONB,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_state VARCHAR(50) DEFAULT 'clean'
);

-- =====================================================
-- Import History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_import_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES test_external_sources(id) ON DELETE CASCADE,
    import_type VARCHAR(50),
    records_imported INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_external_sources_user
    ON test_external_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_external_sources_type
    ON test_external_sources(source_type);

CREATE INDEX IF NOT EXISTS idx_external_data_source
    ON test_external_data(source_id);

CREATE INDEX IF NOT EXISTS idx_external_data_type
    ON test_external_data(data_type);

CREATE INDEX IF NOT EXISTS idx_external_data_indexed
    ON test_external_data(indexed_at);

CREATE INDEX IF NOT EXISTS idx_import_history_source
    ON test_import_history(source_id);

CREATE INDEX IF NOT EXISTS idx_import_history_status
    ON test_import_history(status);

-- =====================================================
-- Full-Text Search Index (using pg_trgm)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_external_data_content_trgm
    ON test_external_data USING gin (content gin_trgm_ops);

-- =====================================================
-- Updated Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to test_external_sources
DROP TRIGGER IF EXISTS update_test_external_sources_updated_at ON test_external_sources;
CREATE TRIGGER update_test_external_sources_updated_at
    BEFORE UPDATE ON test_external_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lucidi_test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lucidi_test;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL test database initialized successfully!';
    RAISE NOTICE 'Tables created: test_external_sources, test_external_data, test_import_history';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm';
END $$;
