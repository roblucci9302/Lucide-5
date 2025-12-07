/**
 * PostgreSQL Database Connector
 */

const { Pool } = require('pg');

class PostgreSQLConnector {
    constructor(config) {
        this.config = config;
        this.pool = null;
    }

    /**
     * Connect to PostgreSQL database
     */
    async connect() {
        this.pool = new Pool({
            host: this.config.host,
            port: this.config.port || 5432,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            max: this.config.maxConnections || 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });

        // Test connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();

        console.log(`[PostgreSQL] Connected to ${this.config.database}`);
    }

    /**
     * Execute SQL query
     */
    async execute(query, params = []) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }

        try {
            const result = await this.pool.query(query, params);
            return {
                rows: result.rows,
                rowCount: result.rowCount,
                fields: result.fields
            };
        } catch (error) {
            console.error('[PostgreSQL] Query error:', error);
            throw error;
        }
    }

    /**
     * Get database schema
     */
    async getSchema() {
        const query = `
            SELECT
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        `;

        const result = await this.execute(query);

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
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `;

        const result = await this.execute(query);
        return result.rows.map(row => row.table_name);
    }

    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('[PostgreSQL] Disconnected');
        }
    }
}

module.exports = PostgreSQLConnector;
