-- =====================================================
-- Lucidi Test Database - MySQL Test Data
-- =====================================================

-- Insert test external sources
INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config, status)
VALUES
    (UUID(), 'test_user_1', 'mysql', 'Test MySQL Source', '{"host": "localhost", "port": 3306, "database": "test_db"}', 'active'),
    (UUID(), 'test_user_1', 'postgres', 'Test PostgreSQL Source', '{"host": "localhost", "port": 5432, "database": "test_db"}', 'active'),
    (UUID(), 'test_user_2', 'rest_api', 'Test REST API', '{"url": "https://api.example.com", "method": "GET"}', 'active');

-- Note: More test data can be inserted programmatically in tests
-- This provides a minimal baseline for manual testing

SELECT 'MySQL test data loaded successfully!' AS message;
SELECT 'Test sources inserted: 3' AS info;
