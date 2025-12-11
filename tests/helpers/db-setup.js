/**
 * Database Setup Helper for Integration Tests
 *
 * Provides utilities for setting up and tearing down test databases
 * Supports PostgreSQL, MySQL, and SQLite
 */

const { loaders } = require('../../src/features/common/utils/dependencyLoader');
const path = require('path');
const fs = require('fs');

class TestDatabaseManager {
    constructor() {
        this.pgPool = null;
        this.mysqlConnection = null;
        this.sqliteDb = null;
    }

    /**
     * Setup PostgreSQL for testing
     * @returns {Promise<Object>} PostgreSQL pool
     */
    async setupPostgres() {
        const pg = loaders.loadPostgres();

        // Check if real PostgreSQL is available
        if (pg.Pool && pg.Pool.name === 'MockPool') {
            console.warn('[TestDB] PostgreSQL not available. Using mock.');
            return null;
        }

        this.pgPool = new pg.Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DATABASE || 'lucidi_test',
            user: process.env.POSTGRES_USER || 'lucidi_test',
            password: process.env.POSTGRES_PASSWORD || 'test_password_2024',
            max: 5,
            idleTimeoutMillis: 30000
        });

        try {
            // Test connection
            const client = await this.pgPool.connect();
            const result = await client.query('SELECT NOW() as now, version() as version');
            client.release();

            console.log(`✅ PostgreSQL test database connected (${result.rows[0].version.split(',')[0]})`);
            return this.pgPool;
        } catch (error) {
            console.error('[TestDB] PostgreSQL connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Setup MySQL for testing
     * @returns {Promise<Object>} MySQL connection
     */
    async setupMySQL() {
        const mysql = loaders.loadMySQL();

        // Check if real MySQL is available
        if (!mysql.createConnection || typeof mysql.createConnection !== 'function') {
            console.warn('[TestDB] MySQL not available. Using mock.');
            return null;
        }

        try {
            // Create connection pool
            this.mysqlConnection = await mysql.createConnection({
                host: process.env.MYSQL_HOST || 'localhost',
                port: parseInt(process.env.MYSQL_PORT || '3306'),
                database: process.env.MYSQL_DATABASE || 'lucidi_test',
                user: process.env.MYSQL_USER || 'lucidi_test',
                password: process.env.MYSQL_PASSWORD || 'test_password_2024'
            });

            // Test connection
            const [rows] = await this.mysqlConnection.query('SELECT NOW() as now, VERSION() as version');
            console.log(`✅ MySQL test database connected (${rows[0].version})`);

            return this.mysqlConnection;
        } catch (error) {
            console.error('[TestDB] MySQL connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Setup SQLite for testing
     * @returns {Object} SQLite database
     */
    setupSQLite() {
        const Database = loaders.loadSqlite();

        // Check if real SQLite is available
        if (Database.name === 'MockDatabase') {
            console.warn('[TestDB] SQLite not available. Using mock.');
            return new Database(':memory:');
        }

        const testDbPath = path.join(__dirname, '../test-data.db');

        // Remove old test database if exists
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }

        this.sqliteDb = new Database(testDbPath);

        // Enable foreign key constraints
        this.sqliteDb.pragma('foreign_keys = ON');

        // Initialize schema
        this.sqliteDb.exec(`
            CREATE TABLE IF NOT EXISTS test_documents (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                file_type TEXT,
                created_at INTEGER,
                indexed INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS test_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                chunk_index INTEGER,
                content TEXT,
                embedding TEXT,
                FOREIGN KEY (document_id) REFERENCES test_documents(id) ON DELETE CASCADE
            );
        `);

        console.log('✅ SQLite test database created');
        return this.sqliteDb;
    }

    /**
     * Clean all test data from PostgreSQL
     * @returns {Promise<void>}
     */
    async cleanPostgres() {
        if (!this.pgPool) return;

        try {
            await this.pgPool.query('TRUNCATE TABLE test_import_history CASCADE');
            await this.pgPool.query('TRUNCATE TABLE test_external_data CASCADE');
            await this.pgPool.query('TRUNCATE TABLE test_external_sources CASCADE');
            console.log('🧹 PostgreSQL test data cleaned');
        } catch (error) {
            console.error('[TestDB] Error cleaning PostgreSQL:', error.message);
        }
    }

    /**
     * Clean all test data from MySQL
     * @returns {Promise<void>}
     */
    async cleanMySQL() {
        if (!this.mysqlConnection) return;

        try {
            await this.mysqlConnection.query('SET FOREIGN_KEY_CHECKS = 0');
            await this.mysqlConnection.query('TRUNCATE TABLE test_import_history');
            await this.mysqlConnection.query('TRUNCATE TABLE test_external_data');
            await this.mysqlConnection.query('TRUNCATE TABLE test_external_sources');
            await this.mysqlConnection.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('🧹 MySQL test data cleaned');
        } catch (error) {
            console.error('[TestDB] Error cleaning MySQL:', error.message);
        }
    }

    /**
     * Clean all test data from SQLite
     */
    cleanSQLite() {
        if (!this.sqliteDb) return;

        try {
            this.sqliteDb.exec('DELETE FROM test_chunks');
            this.sqliteDb.exec('DELETE FROM test_documents');
            console.log('🧹 SQLite test data cleaned');
        } catch (error) {
            console.error('[TestDB] Error cleaning SQLite:', error.message);
        }
    }

    /**
     * Clean all databases
     * @returns {Promise<void>}
     */
    async cleanAll() {
        await this.cleanPostgres();
        await this.cleanMySQL();
        this.cleanSQLite();
    }

    /**
     * Close all database connections
     * @returns {Promise<void>}
     */
    async closeAll() {
        if (this.pgPool) {
            await this.pgPool.end();
            console.log('🔌 PostgreSQL connection closed');
        }
        if (this.mysqlConnection) {
            await this.mysqlConnection.end();
            console.log('🔌 MySQL connection closed');
        }
        if (this.sqliteDb) {
            this.sqliteDb.close();
            console.log('🔌 SQLite connection closed');
        }
    }

    /**
     * Get connection info for debugging
     * @returns {Object} Connection information
     */
    getConnectionInfo() {
        return {
            postgres: {
                connected: !!this.pgPool,
                host: process.env.POSTGRES_HOST || 'localhost',
                port: process.env.POSTGRES_PORT || 5432,
                database: process.env.POSTGRES_DATABASE || 'lucidi_test'
            },
            mysql: {
                connected: !!this.mysqlConnection,
                host: process.env.MYSQL_HOST || 'localhost',
                port: process.env.MYSQL_PORT || 3306,
                database: process.env.MYSQL_DATABASE || 'lucidi_test'
            },
            sqlite: {
                connected: !!this.sqliteDb,
                path: path.join(__dirname, '../test-data.db')
            }
        };
    }
}

module.exports = { TestDatabaseManager };
