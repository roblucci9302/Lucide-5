/**
 * MySQL Database Connector
 */

const mysql = require('mysql2/promise');

class MySQLConnector {
    constructor(config) {
        this.config = config;
        this.pool = null;
    }

    /**
     * Connect to MySQL database
     */
    async connect() {
        this.pool = mysql.createPool({
            host: this.config.host,
            port: this.config.port || 3306,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            waitForConnections: true,
            connectionLimit: this.config.maxConnections || 10,
            queueLimit: 0
        });

        // Test connection
        const connection = await this.pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();

        console.log(`[MySQL] Connected to ${this.config.database}`);
    }

    /**
     * Execute SQL query
     */
    async execute(query, params = []) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }

        try {
            const [rows, fields] = await this.pool.query(query, params);
            return {
                rows: Array.isArray(rows) ? rows : [rows],
                rowCount: Array.isArray(rows) ? rows.length : 1,
                fields
            };
        } catch (error) {
            console.error('[MySQL] Query error:', error);
            throw error;
        }
    }

    /**
     * Get database schema
     */
    async getSchema() {
        const query = `
            SELECT
                TABLE_NAME as table_name,
                COLUMN_NAME as column_name,
                DATA_TYPE as data_type,
                IS_NULLABLE as is_nullable,
                COLUMN_DEFAULT as column_default
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `;

        const result = await this.execute(query, [this.config.database]);

        // Group by table
        const schema = {};
        for (const row of result.rows) {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push({
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === 'YES',
                default: row.column_default
            });
        }

        return schema;
    }

    /**
     * Get list of tables
     */
    async getTables() {
        const query = `
            SELECT TABLE_NAME as table_name
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `;

        const result = await this.execute(query, [this.config.database]);
        return result.rows.map(row => row.table_name);
    }

    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('[MySQL] Disconnected');
        }
    }
}

module.exports = MySQLConnector;
