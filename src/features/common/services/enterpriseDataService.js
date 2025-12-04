/**
 * Enterprise Data Service - Phase 3
 * Client-side service for connecting to enterprise databases via Gateway
 *
 * Features:
 * - Natural language to SQL queries
 * - Database schema exploration
 * - Secure query execution via Gateway API
 * - Multiple database support
 * - Caching for performance
 */

const fetch = require('node-fetch');

class EnterpriseDataService {
    constructor() {
        this.config = {
            gatewayUrl: process.env.ENTERPRISE_GATEWAY_URL || 'http://localhost:3002',
            timeout: 30000
        };

        this.authToken = null;
        this.isConnected = false;
        this.availableDatabases = [];
        this.schemaCache = new Map();

        // Stats
        this.stats = {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            averageResponseTime: 0,
            lastError: null
        };
    }

    /**
     * Connect to Enterprise Gateway
     * @param {string} gatewayToken - JWT token for gateway authentication
     */
    async connect(gatewayToken) {
        if (!gatewayToken) {
            throw new Error('[EnterpriseData] Gateway token is required');
        }

        this.authToken = gatewayToken;

        try {
            // Test connection and get available databases
            const response = await fetch(`${this.config.gatewayUrl}/api/v1/databases`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Gateway connection failed: ${response.statusText}`);
            }

            const data = await response.json();
            this.availableDatabases = data.databases || [];
            this.isConnected = true;

            console.log(`[EnterpriseData] ✅ Connected to gateway - ${this.availableDatabases.length} databases available`);
            return {
                success: true,
                databases: this.availableDatabases
            };
        } catch (error) {
            console.error('[EnterpriseData] Connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Disconnect from gateway
     */
    disconnect() {
        this.authToken = null;
        this.isConnected = false;
        this.availableDatabases = [];
        this.schemaCache.clear();
        console.log('[EnterpriseData] Disconnected from gateway');
    }

    /**
     * Ask a question in natural language
     * Gateway will convert to SQL and execute
     * @param {string} question - Natural language question
     * @param {string} database - Database identifier
     * @returns {Promise<Object>} Query results
     */
    async askQuestion(question, database) {
        if (!this.isConnected) {
            throw new Error('[EnterpriseData] Not connected to gateway');
        }

        if (!question || typeof question !== 'string') {
            throw new Error('[EnterpriseData] Question must be a non-empty string');
        }

        const startTime = Date.now();
        this.stats.totalQueries++;

        try {
            console.log(`[EnterpriseData] 🤔 Asking: "${question}" on database: ${database}`);

            const response = await fetch(`${this.config.gatewayUrl}/api/v1/query/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    question,
                    database
                }),
                timeout: this.config.timeout
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || response.statusText);
            }

            const result = await response.json();
            const duration = Date.now() - startTime;

            // Update stats
            this.stats.successfulQueries++;
            this.updateAverageResponseTime(duration);

            console.log(`[EnterpriseData] ✅ Query completed in ${duration}ms - ${result.rowCount} rows returned`);

            return {
                success: true,
                data: result.data,
                generatedSQL: result.sql,
                rowCount: result.rowCount,
                executionTime: result.executionTime,
                database: result.database
            };
        } catch (error) {
            this.stats.failedQueries++;
            this.stats.lastError = error.message;
            console.error('[EnterpriseData] ❌ Query failed:', error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute SQL query directly
     * @param {string} sql - SQL query
     * @param {string} database - Database identifier
     * @param {Array} params - Query parameters (for prepared statements)
     * @returns {Promise<Object>} Query results
     */
    async executeQuery(sql, database, params = []) {
        if (!this.isConnected) {
            throw new Error('[EnterpriseData] Not connected to gateway');
        }

        const startTime = Date.now();
        this.stats.totalQueries++;

        try {
            console.log(`[EnterpriseData] 🔍 Executing SQL on database: ${database}`);

            const response = await fetch(`${this.config.gatewayUrl}/api/v1/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    database,
                    query: sql,
                    params
                }),
                timeout: this.config.timeout
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || response.statusText);
            }

            const result = await response.json();
            const duration = Date.now() - startTime;

            this.stats.successfulQueries++;
            this.updateAverageResponseTime(duration);

            console.log(`[EnterpriseData] ✅ Query executed in ${duration}ms - ${result.rowCount} rows`);

            return {
                success: true,
                data: result.data,
                rowCount: result.rowCount,
                executionTime: result.executionTime
            };
        } catch (error) {
            this.stats.failedQueries++;
            this.stats.lastError = error.message;
            console.error('[EnterpriseData] ❌ Query execution failed:', error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get database schema
     * @param {string} database - Database identifier
     * @param {boolean} useCache - Use cached schema if available
     * @returns {Promise<Object>} Database schema
     */
    async getSchema(database, useCache = true) {
        if (!this.isConnected) {
            throw new Error('[EnterpriseData] Not connected to gateway');
        }

        // Check cache first
        if (useCache && this.schemaCache.has(database)) {
            console.log(`[EnterpriseData] 📦 Using cached schema for ${database}`);
            return this.schemaCache.get(database);
        }

        try {
            console.log(`[EnterpriseData] 🔍 Fetching schema for database: ${database}`);

            const response = await fetch(`${this.config.gatewayUrl}/api/v1/schema/${database}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || response.statusText);
            }

            const schema = await response.json();

            // Cache schema
            this.schemaCache.set(database, schema);

            console.log(`[EnterpriseData] ✅ Schema fetched - ${Object.keys(schema.tables || {}).length} tables`);

            return schema;
        } catch (error) {
            console.error('[EnterpriseData] ❌ Failed to fetch schema:', error);
            throw error;
        }
    }

    /**
     * Get list of available databases
     * @returns {Array<string>} Database identifiers
     */
    getAvailableDatabases() {
        return this.availableDatabases;
    }

    /**
     * Check if connected to gateway
     * @returns {boolean}
     */
    isGatewayConnected() {
        return this.isConnected;
    }

    /**
     * Get query statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            availableDatabases: this.availableDatabases.length,
            cachedSchemas: this.schemaCache.size
        };
    }

    /**
     * Clear schema cache
     */
    clearCache() {
        this.schemaCache.clear();
        console.log('[EnterpriseData] Schema cache cleared');
    }

    /**
     * Update average response time
     */
    updateAverageResponseTime(newTime) {
        const total = this.stats.successfulQueries;
        const currentAvg = this.stats.averageResponseTime;
        this.stats.averageResponseTime = ((currentAvg * (total - 1)) + newTime) / total;
    }

    /**
     * Format query results for display
     * @param {Array} data - Query results
     * @param {number} maxRows - Maximum rows to display
     * @returns {string} Formatted table
     */
    formatResults(data, maxRows = 50) {
        if (!data || data.length === 0) {
            return 'No results found.';
        }

        const displayData = data.slice(0, maxRows);
        const columns = Object.keys(displayData[0]);

        let table = '\n';

        // Header
        table += '| ' + columns.join(' | ') + ' |\n';
        table += '|' + columns.map(() => '---').join('|') + '|\n';

        // Rows
        for (const row of displayData) {
            table += '| ' + columns.map(col => {
                const val = row[col];
                return val === null ? 'NULL' : String(val).substring(0, 50);
            }).join(' | ') + ' |\n';
        }

        if (data.length > maxRows) {
            table += `\n... ${data.length - maxRows} more rows\n`;
        }

        return table;
    }
}

// Singleton instance
const enterpriseDataService = new EnterpriseDataService();

module.exports = enterpriseDataService;
