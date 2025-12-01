-- =====================================================
-- Lucidi Test Database - MySQL Initialization
-- =====================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- External Data Sources Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_external_sources (
    id CHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255),
    connection_config JSON NOT NULL,
    credentials_encrypted BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_type (source_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- External Data Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_external_data (
    id CHAR(36) PRIMARY KEY,
    source_id CHAR(36),
    data_type VARCHAR(100),
    content TEXT,
    metadata JSON,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_state VARCHAR(50) DEFAULT 'clean',
    FOREIGN KEY (source_id) REFERENCES test_external_sources(id) ON DELETE CASCADE,
    INDEX idx_source (source_id),
    INDEX idx_type (data_type),
    INDEX idx_indexed (indexed_at),
    FULLTEXT INDEX idx_content_fulltext (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Import History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS test_import_history (
    id CHAR(36) PRIMARY KEY,
    source_id CHAR(36),
    import_type VARCHAR(50),
    records_imported INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    FOREIGN KEY (source_id) REFERENCES test_external_sources(id) ON DELETE CASCADE,
    INDEX idx_source (source_id),
    INDEX idx_status (status),
    INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Success Message
-- =====================================================
SELECT 'MySQL test database initialized successfully!' AS message;
SELECT 'Tables created: test_external_sources, test_external_data, test_import_history' AS info;
