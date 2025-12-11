/**
 * Base Repository Classes
 *
 * Provides base implementations for SQLite and Firebase repositories
 * to eliminate code duplication across repository files.
 */

const { createLogger } = require('../utils/logger');

/**
 * Base SQLite Repository
 * Provides common CRUD operations for SQLite tables
 */
class BaseSqliteRepository {
    /**
     * @param {string} tableName - Database table name
     * @param {Function} getDb - Function to get database instance
     */
    constructor(tableName, getDb) {
        this.tableName = tableName;
        this.getDb = getDb;
        this.logger = createLogger(`${tableName}Repository`);
    }

    /**
     * Get current Unix timestamp
     * @returns {number}
     */
    getTimestamp() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Get record by ID
     * @param {string|number} id - Record ID
     * @returns {Object|null}
     */
    getById(id) {
        const db = this.getDb();
        return db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    }

    /**
     * Get all records
     * @param {Object} options - Query options
     * @param {number} options.limit - Max records to return
     * @param {number} options.offset - Records to skip
     * @param {string} options.orderBy - Column to order by
     * @param {string} options.order - Order direction (ASC/DESC)
     * @returns {Array}
     */
    getAll(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'id', order = 'DESC' } = options;
        const db = this.getDb();

        const validOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const query = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${validOrder} LIMIT ? OFFSET ?`;

        return db.prepare(query).all(limit, offset);
    }

    /**
     * Get records by a specific field value
     * @param {string} field - Field name
     * @param {any} value - Field value
     * @returns {Array}
     */
    getByField(field, value) {
        const db = this.getDb();
        return db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`).all(value);
    }

    /**
     * Get single record by field value
     * @param {string} field - Field name
     * @param {any} value - Field value
     * @returns {Object|null}
     */
    getOneByField(field, value) {
        const db = this.getDb();
        return db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`).get(value);
    }

    /**
     * Delete record by ID
     * @param {string|number} id - Record ID
     * @returns {Object} - Result with changes count
     */
    deleteById(id) {
        const db = this.getDb();
        const result = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
        return { changes: result.changes };
    }

    /**
     * Delete records by field value
     * @param {string} field - Field name
     * @param {any} value - Field value
     * @returns {Object} - Result with changes count
     */
    deleteByField(field, value) {
        const db = this.getDb();
        const result = db.prepare(`DELETE FROM ${this.tableName} WHERE ${field} = ?`).run(value);
        return { changes: result.changes };
    }

    /**
     * Count all records
     * @returns {number}
     */
    count() {
        const db = this.getDb();
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get();
        return result.count;
    }

    /**
     * Count records by field value
     * @param {string} field - Field name
     * @param {any} value - Field value
     * @returns {number}
     */
    countByField(field, value) {
        const db = this.getDb();
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${field} = ?`).get(value);
        return result.count;
    }

    /**
     * Check if record exists
     * @param {string|number} id - Record ID
     * @returns {boolean}
     */
    exists(id) {
        const db = this.getDb();
        const result = db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`).get(id);
        return !!result;
    }

    /**
     * Execute raw query
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {any}
     */
    rawQuery(query, params = []) {
        const db = this.getDb();
        return db.prepare(query).all(...params);
    }

    /**
     * Execute raw run (INSERT/UPDATE/DELETE)
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Object}
     */
    rawRun(query, params = []) {
        const db = this.getDb();
        return db.prepare(query).run(...params);
    }
}

/**
 * Timestamp utility functions
 */
const TimestampUtils = {
    /**
     * Get Unix timestamp (seconds)
     * @returns {number}
     */
    unix() {
        return Math.floor(Date.now() / 1000);
    },

    /**
     * Get millisecond timestamp
     * @returns {number}
     */
    millis() {
        return Date.now();
    },

    /**
     * Convert Unix timestamp to Date
     * @param {number} unix - Unix timestamp
     * @returns {Date}
     */
    toDate(unix) {
        return new Date(unix * 1000);
    },

    /**
     * Convert Date to Unix timestamp
     * @param {Date} date - Date object
     * @returns {number}
     */
    fromDate(date) {
        return Math.floor(date.getTime() / 1000);
    }
};

module.exports = {
    BaseSqliteRepository,
    TimestampUtils
};
