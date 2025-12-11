/**
 * Generic Repository
 *
 * Provides a simple CRUD interface for any table using SQLite.
 * Used by Phase 4 services (documents, document_chunks, document_citations).
 */

const sqliteClient = require('../services/sqliteClient');

/**
 * Create a generic repository for a table
 * @param {string} tableName - Name of the table
 * @returns {Object} Repository with query, queryOne, execute, create methods
 */
function createGenericRepository(tableName) {
    return {
        /**
         * Execute a query that returns multiple rows
         * @param {string} sql - SQL query
         * @param {Array} params - Query parameters
         * @returns {Promise<Array>} Results
         */
        async query(sql, params = []) {
            try {
                const db = sqliteClient.getDatabase();
                const stmt = db.prepare(sql);
                const results = stmt.all(...params);
                return results;
            } catch (error) {
                console.error(`[GenericRepository:${tableName}] Query error:`, error);
                throw error;
            }
        },

        /**
         * Execute a query that returns a single row
         * @param {string} sql - SQL query
         * @param {Array} params - Query parameters
         * @returns {Promise<Object|null>} Single result or null
         */
        async queryOne(sql, params = []) {
            try {
                const db = sqliteClient.getDatabase();
                const stmt = db.prepare(sql);
                const result = stmt.get(...params);
                return result || null;
            } catch (error) {
                console.error(`[GenericRepository:${tableName}] QueryOne error:`, error);
                throw error;
            }
        },

        /**
         * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
         * @param {string} sql - SQL query
         * @param {Array} params - Query parameters
         * @returns {Promise<Object>} Result info (changes, lastInsertRowid)
         */
        async execute(sql, params = []) {
            try {
                const db = sqliteClient.getDatabase();
                const stmt = db.prepare(sql);
                const result = stmt.run(...params);
                return result;
            } catch (error) {
                console.error(`[GenericRepository:${tableName}] Execute error:`, error);
                throw error;
            }
        },

        /**
         * Create a record in the table
         * @param {Object} data - Data to insert
         * @returns {Promise<Object>} Result info
         */
        async create(data) {
            try {
                const columns = Object.keys(data).join(', ');
                const placeholders = Object.keys(data).map(() => '?').join(', ');
                const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

                const db = sqliteClient.getDatabase();
                const stmt = db.prepare(sql);
                const result = stmt.run(...Object.values(data));

                return result;
            } catch (error) {
                console.error(`[GenericRepository:${tableName}] Create error:`, error);
                throw error;
            }
        },

        /**
         * Get table name
         * @returns {string} Table name
         */
        getTableName() {
            return tableName;
        }
    };
}

module.exports = {
    createGenericRepository
};
