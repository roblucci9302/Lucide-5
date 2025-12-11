/**
 * External Data Service
 *
 * Service pour la connexion et l'import de données depuis des sources externes:
 * - PostgreSQL
 * - MySQL
 * - MongoDB
 * - REST APIs
 * - Notion
 * - Airtable
 *
 * Fonctionnalités:
 * - Test de connexion
 * - Exécution de queries
 * - Import automatique avec mapping
 * - Auto-indexation des données importées
 * - Historique des imports
 * - Gestion des credentials encryptés
 * - Retry automatique avec backoff exponentiel
 *
 * @module externalDataService
 */

const { loaders } = require('../utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
const sqliteClient = require('./sqliteClient');
const autoIndexingService = require('./autoIndexingService');
const encryptionService = require('./encryptionService');
const { RETRY } = require('../config/constants');

console.log('[ExternalDataService] Service loaded');

/**
 * Retry configuration for external connections
 */
const RETRY_CONFIG = {
    maxAttempts: RETRY.MAX_ATTEMPTS_NETWORK || 4,
    initialDelay: RETRY.INITIAL_DELAY || 1000,
    backoffMultiplier: RETRY.BACKOFF_MULTIPLIER || 2,
    maxDelay: 16000 // Max 16 seconds between retries
};

/**
 * Execute an async operation with retry and exponential backoff
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<*>} Result of the operation
 */
async function withRetry(operation, options = {}) {
    const {
        maxAttempts = RETRY_CONFIG.maxAttempts,
        initialDelay = RETRY_CONFIG.initialDelay,
        backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
        maxDelay = RETRY_CONFIG.maxDelay,
        retryableErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
        operationName = 'operation'
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            const isRetryable = retryableErrors.some(code =>
                error.code === code ||
                error.message?.includes(code) ||
                error.message?.includes('timeout') ||
                error.message?.includes('ECONNREFUSED') ||
                error.message?.includes('network')
            );

            if (!isRetryable || attempt === maxAttempts) {
                throw error;
            }

            console.warn(`[ExternalDataService] ${operationName} failed (attempt ${attempt}/${maxAttempts}): ${error.message}. Retrying in ${delay}ms...`);

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));

            // Increase delay with exponential backoff
            delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
    }

    throw lastError;
}

class ExternalDataService {
    constructor() {
        this.db = null;
        this.connections = {}; // Cache des connexions actives
        console.log('[ExternalDataService] Service initialized');
    }

    /**
     * Initialize the service
     */
    async initialize() {
        if (!this.db) {
            this.db = sqliteClient.getDb();
        }
        console.log('[ExternalDataService] Service ready');
    }

    /**
     * Execute an operation with automatic retry
     * @param {Function} operation - Async function to execute
     * @param {string} operationName - Name for logging
     * @returns {Promise<*>} Result of the operation
     */
    async _withRetry(operation, operationName = 'operation') {
        return withRetry(operation, { operationName });
    }

    // ========================================================================
    // POSTGRESQL CONNECTION
    // ========================================================================

    /**
     * Test PostgreSQL connection
     *
     * @param {object} config - PostgreSQL connection config
     * @param {string} config.host - Host
     * @param {number} config.port - Port (default: 5432)
     * @param {string} config.database - Database name
     * @param {string} config.user - Username
     * @param {string} config.password - Password
     * @returns {Promise<object>} Test result
     */
    async testPostgresConnection(config) {
        try {
            // Load PostgreSQL package with graceful degradation
            const pg = loaders.loadPostgres();

            // Check if it's the mock (not available)
            if (pg.Pool && pg.Pool.name === 'MockPool') {
                return {
                    success: false,
                    error: 'PostgreSQL driver not installed. Run: npm install pg',
                    needsInstall: true
                };
            }

            const { Pool } = pg;
            const pool = new Pool({
                host: config.host,
                port: config.port || 5432,
                database: config.database,
                user: config.user,
                password: config.password,
                connectionTimeoutMillis: 5000
            });

            // Test simple query
            const result = await pool.query('SELECT NOW() as current_time, version() as version');

            await pool.end();

            return {
                success: true,
                message: 'PostgreSQL connection successful',
                serverTime: result.rows[0].current_time,
                version: result.rows[0].version
            };

        } catch (error) {
            console.error('[ExternalDataService] PostgreSQL test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute query on PostgreSQL database
     *
     * @param {string} sourceId - External source ID
     * @param {string} query - SQL query to execute
     * @param {array} params - Query parameters (optional)
     * @returns {Promise<object>} Query result
     */
    async queryPostgres(sourceId, query, params = []) {
        try {
            // Get source config
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            if (source.source_type !== 'postgresql') {
                throw new Error('Source is not PostgreSQL');
            }

            // Load PostgreSQL package with graceful degradation
            const pg = loaders.loadPostgres();

            // Check if it's the mock (not available)
            if (pg.Pool && pg.Pool.name === 'MockPool') {
                throw new Error('PostgreSQL driver not installed. Run: npm install pg');
            }

            // Decrypt credentials
            const config = JSON.parse(source.connection_config);
            if (source.credentials_encrypted) {
                config.password = await encryptionService.decrypt(config.password);
            }

            const { Pool } = pg;
            const pool = new Pool({
                host: config.host,
                port: config.port || 5432,
                database: config.database,
                user: config.user,
                password: config.password
            });

            // Execute query
            const result = await pool.query(query, params);

            await pool.end();

            return {
                success: true,
                rows: result.rows,
                rowCount: result.rowCount,
                fields: result.fields
            };

        } catch (error) {
            console.error('[ExternalDataService] PostgreSQL query failed:', error.message);
            throw error;
        }
    }

    // ========================================================================
    // MYSQL CONNECTION
    // ========================================================================

    /**
     * Test MySQL connection
     *
     * @param {object} config - MySQL connection config
     * @param {string} config.host - Host
     * @param {number} config.port - Port (default: 3306)
     * @param {string} config.database - Database name
     * @param {string} config.user - Username
     * @param {string} config.password - Password
     * @returns {Promise<object>} Test result
     */
    async testMySQLConnection(config) {
        try {
            // Load MySQL package with graceful degradation
            const mysql = loaders.loadMySQL();

            // Check if it's the mock (not available)
            if (!mysql.createConnection || typeof mysql.createConnection !== 'function') {
                return {
                    success: false,
                    error: 'MySQL driver not installed. Run: npm install mysql2',
                    needsInstall: true
                };
            }

            // MySQL needs promise version
            if (!mysql.createConnection().then) {
                return {
                    success: false,
                    error: 'MySQL driver not installed. Run: npm install mysql2',
                    needsInstall: true
                };
            }

            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                database: config.database,
                user: config.user,
                password: config.password,
                connectTimeout: 5000
            });

            // Test simple query
            const [rows] = await connection.execute('SELECT NOW() as current_time, VERSION() as version');

            await connection.end();

            return {
                success: true,
                message: 'MySQL connection successful',
                serverTime: rows[0].current_time,
                version: rows[0].version
            };

        } catch (error) {
            console.error('[ExternalDataService] MySQL test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute query on MySQL database
     *
     * @param {string} sourceId - External source ID
     * @param {string} query - SQL query to execute
     * @param {array} params - Query parameters (optional)
     * @returns {Promise<object>} Query result
     */
    async queryMySQL(sourceId, query, params = []) {
        try {
            // Get source config
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            if (source.source_type !== 'mysql') {
                throw new Error('Source is not MySQL');
            }

            // Load MySQL driver with graceful degradation
            const mysql = loaders.loadMySQL();

            // Check if it's the mock (not available)
            if (!mysql.createConnection || typeof mysql.createConnection !== 'function') {
                throw new Error('MySQL driver not installed. Run: npm install mysql2');
            }

            // Decrypt credentials
            const config = JSON.parse(source.connection_config);
            if (source.credentials_encrypted) {
                config.password = await encryptionService.decrypt(config.password);
            }

            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                database: config.database,
                user: config.user,
                password: config.password
            });

            // Execute query
            const [rows, fields] = await connection.execute(query, params);

            await connection.end();

            return {
                success: true,
                rows: rows,
                rowCount: rows.length,
                fields: fields
            };

        } catch (error) {
            console.error('[ExternalDataService] MySQL query failed:', error.message);
            throw error;
        }
    }

    // ========================================================================
    // MONGODB CONNECTION
    // ========================================================================

    /**
     * Test MongoDB connection
     *
     * @param {object} config - MongoDB connection config
     * @param {string} config.connectionString - MongoDB connection string (mongodb://...)
     * @param {string} config.database - Database name
     * @returns {Promise<object>} Test result
     */
    async testMongoDBConnection(config) {
        try {
            // Load MongoDB package with graceful degradation
            const mongodb = loaders.loadMongoDB();

            // Check if it's the mock (not available)
            if (!mongodb.MongoClient) {
                return {
                    success: false,
                    error: 'MongoDB driver not installed. Run: npm install mongodb',
                    needsInstall: true
                };
            }

            const { MongoClient } = mongodb;

            // Build connection string
            let connectionString = config.connectionString;
            if (!connectionString) {
                // Build from individual params
                const auth = config.user && config.password
                    ? `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@`
                    : '';
                connectionString = `mongodb://${auth}${config.host}:${config.port || 27017}`;
            }

            const client = new MongoClient(connectionString, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });

            await client.connect();

            // Test database access
            const db = client.db(config.database);
            const collections = await db.listCollections().toArray();

            await client.close();

            return {
                success: true,
                message: 'MongoDB connection successful',
                database: config.database,
                collections: collections.map(c => c.name)
            };

        } catch (error) {
            console.error('[ExternalDataService] MongoDB test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Query MongoDB collection
     *
     * @param {string} sourceId - External source ID
     * @param {string} collection - Collection name
     * @param {object} filter - MongoDB query filter
     * @param {object} options - Query options (limit, skip, projection)
     * @returns {Promise<object>} Query result
     */
    async queryMongoDB(sourceId, collection, filter = {}, options = {}) {
        try {
            // Get source config
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            if (source.source_type !== 'mongodb') {
                throw new Error('Source is not MongoDB');
            }

            // Load MongoDB package
            const mongodb = loaders.loadMongoDB();

            if (!mongodb.MongoClient) {
                throw new Error('MongoDB driver not installed. Run: npm install mongodb');
            }

            const { MongoClient } = mongodb;

            // Decrypt credentials if needed
            const config = JSON.parse(source.connection_config);
            if (source.credentials_encrypted && config.password) {
                config.password = await encryptionService.decrypt(config.password);
            }

            // Build connection string
            let connectionString = config.connectionString;
            if (!connectionString) {
                const auth = config.user && config.password
                    ? `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@`
                    : '';
                connectionString = `mongodb://${auth}${config.host}:${config.port || 27017}`;
            }

            const client = new MongoClient(connectionString);
            await client.connect();

            const db = client.db(config.database);
            const coll = db.collection(collection);

            // Execute query
            const { limit = 1000, skip = 0, projection = null } = options;
            let cursor = coll.find(filter);

            if (projection) {
                cursor = cursor.project(projection);
            }
            if (skip > 0) {
                cursor = cursor.skip(skip);
            }
            cursor = cursor.limit(limit);

            const documents = await cursor.toArray();

            await client.close();

            return {
                success: true,
                rows: documents,
                rowCount: documents.length
            };

        } catch (error) {
            console.error('[ExternalDataService] MongoDB query failed:', error.message);
            throw error;
        }
    }

    /**
     * Import data from MongoDB
     *
     * @param {string} sourceId - External source ID
     * @param {string} collection - Collection name
     * @param {object} filter - MongoDB query filter
     * @param {object} mappingConfig - Column mapping configuration
     * @param {string} uid - User ID
     * @returns {Promise<object>} Import result
     */
    async importFromMongoDB(sourceId, collection, filter, mappingConfig, uid) {
        try {
            console.log(`[ExternalDataService] Starting MongoDB import from source: ${sourceId}`);

            // Query MongoDB
            const queryResult = await this.queryMongoDB(sourceId, collection, filter);

            if (!queryResult.success) {
                throw new Error('MongoDB query failed');
            }

            const documents = queryResult.rows;
            console.log(`[ExternalDataService] Retrieved ${documents.length} documents from MongoDB`);

            // Map and index each document
            const importId = uuidv4();
            const indexedContent = [];
            let successCount = 0;
            let errorCount = 0;

            for (const doc of documents) {
                try {
                    // Map document to indexable content
                    const content = this._mapDocumentToContent(doc, mappingConfig);

                    // Index content
                    const indexed = await this._indexExternalContent(
                        content,
                        uid,
                        sourceId,
                        importId
                    );

                    if (indexed) {
                        indexedContent.push(indexed);
                        successCount++;
                    }
                } catch (error) {
                    console.error('[ExternalDataService] Failed to index document:', error.message);
                    errorCount++;
                }
            }

            // Record import history
            await this._recordImportHistory(importId, sourceId, uid, {
                collection: collection,
                filter: JSON.stringify(filter),
                totalDocs: documents.length,
                successCount: successCount,
                errorCount: errorCount
            });

            // Update last_sync_at
            const now = Date.now();
            this.db.prepare(`
                UPDATE external_sources
                SET last_sync_at = ?, updated_at = ?
                WHERE id = ?
            `).run(now, now, sourceId);

            console.log(`[ExternalDataService] MongoDB import completed: ${successCount} indexed, ${errorCount} errors`);

            return {
                success: true,
                importId: importId,
                totalDocuments: documents.length,
                indexedCount: successCount,
                errorCount: errorCount,
                indexedContent: indexedContent
            };

        } catch (error) {
            console.error('[ExternalDataService] MongoDB import failed:', error.message);
            throw error;
        }
    }

    /**
     * Map MongoDB document to indexable content
     * @private
     */
    _mapDocumentToContent(doc, mappingConfig) {
        const {
            titleField = '_id',
            contentFields = [],
            metadataFields = []
        } = mappingConfig;

        // Build title
        let title = 'MongoDB Document';
        if (titleField && doc[titleField]) {
            title = String(doc[titleField]);
        }

        // Build content text from specified fields
        let contentText = '';
        if (contentFields.length > 0) {
            contentText = contentFields
                .map(field => {
                    const value = this._getNestedValue(doc, field);
                    return value ? String(value) : '';
                })
                .filter(text => text.length > 0)
                .join('\n\n');
        } else {
            // If no fields specified, stringify the entire document
            contentText = JSON.stringify(doc, null, 2);
        }

        // Extract metadata
        const metadata = {};
        metadataFields.forEach(field => {
            const value = this._getNestedValue(doc, field);
            if (value !== undefined) {
                metadata[field] = value;
            }
        });

        return {
            title: title,
            content: contentText,
            metadata: metadata,
            rawData: doc
        };
    }

    /**
     * Get nested value from object using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // ========================================================================
    // REST API CONNECTION
    // ========================================================================

    /**
     * Test REST API connection
     *
     * @param {object} config - REST API config
     * @param {string} config.baseUrl - Base URL
     * @param {object} config.headers - HTTP headers (optional)
     * @param {string} config.authType - Auth type: 'none', 'bearer', 'basic', 'apikey'
     * @param {string} config.authToken - Auth token (if authType = 'bearer' or 'apikey')
     * @returns {Promise<object>} Test result
     */
    async testRestAPIConnection(config) {
        try {
            const url = config.baseUrl;
            const headers = { ...config.headers };

            // Add authentication
            if (config.authType === 'bearer' && config.authToken) {
                headers['Authorization'] = `Bearer ${config.authToken}`;
            } else if (config.authType === 'apikey' && config.authToken) {
                headers[config.authKeyHeader || 'X-API-Key'] = config.authToken;
            } else if (config.authType === 'basic' && config.authUsername && config.authPassword) {
                const credentials = Buffer.from(`${config.authUsername}:${config.authPassword}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            return {
                success: true,
                message: 'REST API connection successful',
                status: response.status,
                statusText: response.statusText
            };

        } catch (error) {
            console.error('[ExternalDataService] REST API test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch data from REST API
     *
     * @param {string} sourceId - External source ID
     * @param {string} endpoint - API endpoint (relative to baseUrl)
     * @param {object} options - Fetch options (method, body, etc.)
     * @returns {Promise<object>} API response
     */
    async fetchFromAPI(sourceId, endpoint, options = {}) {
        try {
            // Get source config
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            if (source.source_type !== 'rest_api') {
                throw new Error('Source is not REST API');
            }

            // Decrypt credentials if needed
            const config = JSON.parse(source.connection_config);
            if (source.credentials_encrypted && config.authToken) {
                config.authToken = await encryptionService.decrypt(config.authToken);
            }

            const url = `${config.baseUrl}${endpoint}`;
            const headers = { ...config.headers, ...options.headers };

            // Add authentication
            if (config.authType === 'bearer' && config.authToken) {
                headers['Authorization'] = `Bearer ${config.authToken}`;
            } else if (config.authType === 'apikey' && config.authToken) {
                headers[config.authKeyHeader || 'X-API-Key'] = config.authToken;
            }

            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                data: data,
                status: response.status
            };

        } catch (error) {
            console.error('[ExternalDataService] API fetch failed:', error.message);
            throw error;
        }
    }

    // ========================================================================
    // NOTION CONNECTION
    // ========================================================================

    /**
     * Test Notion connection
     *
     * @param {object} config - Notion config
     * @param {string} config.integrationToken - Notion integration token
     * @returns {Promise<object>} Test result
     */
    async testNotionConnection(config) {
        try {
            if (!config.integrationToken) {
                return {
                    success: false,
                    error: 'Notion integration token is required'
                };
            }

            // Use Notion API directly via fetch
            const response = await fetch('https://api.notion.com/v1/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.integrationToken}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const user = await response.json();

            return {
                success: true,
                message: 'Notion connection successful',
                user: {
                    name: user.name,
                    type: user.type
                }
            };

        } catch (error) {
            console.error('[ExternalDataService] Notion test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Query Notion database
     *
     * @param {string} sourceId - External source ID
     * @param {string} databaseId - Notion database ID
     * @param {object} filter - Notion filter object (optional)
     * @returns {Promise<object>} Query result
     */
    async queryNotion(sourceId, databaseId, filter = null) {
        try {
            // Get source config
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            if (source.source_type !== 'notion') {
                throw new Error('Source is not Notion');
            }

            // Decrypt credentials if needed
            const config = JSON.parse(source.connection_config);
            if (source.credentials_encrypted && config.integrationToken) {
                config.integrationToken = await encryptionService.decrypt(config.integrationToken);
            }

            // Query Notion database
            const body = {};
            if (filter) {
                body.filter = filter;
            }
            body.page_size = 100;

            const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.integrationToken}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                rows: data.results,
                rowCount: data.results.length,
                hasMore: data.has_more,
                nextCursor: data.next_cursor
            };

        } catch (error) {
            console.error('[ExternalDataService] Notion query failed:', error.message);
            throw error;
        }
    }

    /**
     * Import data from Notion database
     *
     * @param {string} sourceId - External source ID
     * @param {string} databaseId - Notion database ID
     * @param {object} filter - Notion filter (optional)
     * @param {string} uid - User ID
     * @returns {Promise<object>} Import result
     */
    async importFromNotion(sourceId, databaseId, filter, uid) {
        try {
            console.log(`[ExternalDataService] Starting Notion import from source: ${sourceId}`);

            // Query Notion
            const queryResult = await this.queryNotion(sourceId, databaseId, filter);

            if (!queryResult.success) {
                throw new Error('Notion query failed');
            }

            const pages = queryResult.rows;
            console.log(`[ExternalDataService] Retrieved ${pages.length} pages from Notion`);

            // Map and index each page
            const importId = uuidv4();
            const indexedContent = [];
            let successCount = 0;
            let errorCount = 0;

            for (const page of pages) {
                try {
                    // Map Notion page to indexable content
                    const content = this._mapNotionPageToContent(page);

                    // Index content
                    const indexed = await this._indexExternalContent(
                        content,
                        uid,
                        sourceId,
                        importId
                    );

                    if (indexed) {
                        indexedContent.push(indexed);
                        successCount++;
                    }
                } catch (error) {
                    console.error('[ExternalDataService] Failed to index Notion page:', error.message);
                    errorCount++;
                }
            }

            // Record import history
            await this._recordImportHistory(importId, sourceId, uid, {
                databaseId: databaseId,
                totalPages: pages.length,
                successCount: successCount,
                errorCount: errorCount
            });

            // Update last_sync_at
            const now = Date.now();
            this.db.prepare(`
                UPDATE external_sources
                SET last_sync_at = ?, updated_at = ?
                WHERE id = ?
            `).run(now, now, sourceId);

            console.log(`[ExternalDataService] Notion import completed: ${successCount} indexed, ${errorCount} errors`);

            return {
                success: true,
                importId: importId,
                totalPages: pages.length,
                indexedCount: successCount,
                errorCount: errorCount,
                indexedContent: indexedContent
            };

        } catch (error) {
            console.error('[ExternalDataService] Notion import failed:', error.message);
            throw error;
        }
    }

    /**
     * Map Notion page to indexable content
     * @private
     */
    _mapNotionPageToContent(page) {
        // Extract title from properties
        let title = 'Notion Page';
        const properties = page.properties || {};

        // Find title property (usually "Name" or "Title")
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'title' && prop.title && prop.title.length > 0) {
                title = prop.title.map(t => t.plain_text).join('');
                break;
            }
        }

        // Build content from all text properties
        const contentParts = [];
        for (const [key, prop] of Object.entries(properties)) {
            const value = this._extractNotionPropertyValue(prop);
            if (value) {
                contentParts.push(`${key}: ${value}`);
            }
        }

        return {
            title: title,
            content: contentParts.join('\n'),
            metadata: {
                notionId: page.id,
                createdTime: page.created_time,
                lastEditedTime: page.last_edited_time,
                url: page.url
            },
            rawData: page
        };
    }

    /**
     * Extract value from Notion property
     * @private
     */
    _extractNotionPropertyValue(prop) {
        if (!prop) return null;

        switch (prop.type) {
            case 'title':
            case 'rich_text':
                return prop[prop.type]?.map(t => t.plain_text).join('') || null;
            case 'number':
                return prop.number?.toString() || null;
            case 'select':
                return prop.select?.name || null;
            case 'multi_select':
                return prop.multi_select?.map(s => s.name).join(', ') || null;
            case 'date':
                return prop.date?.start || null;
            case 'checkbox':
                return prop.checkbox ? 'Yes' : 'No';
            case 'url':
                return prop.url || null;
            case 'email':
                return prop.email || null;
            case 'phone_number':
                return prop.phone_number || null;
            case 'people':
                return prop.people?.map(p => p.name).join(', ') || null;
            case 'status':
                return prop.status?.name || null;
            default:
                return null;
        }
    }

    // ========================================================================
    // AIRTABLE CONNECTION
    // ========================================================================

    /**
     * Test Airtable connection
     *
     * @param {object} config - Airtable config
     * @param {string} config.apiKey - Airtable API key or Personal Access Token
     * @param {string} config.baseId - Airtable base ID (optional for test)
     * @returns {Promise<object>} Test result
     */
    async testAirtableConnection(config) {
        try {
            if (!config.apiKey) {
                return {
                    success: false,
                    error: 'Airtable API key is required'
                };
            }

            // Test by getting user info
            const response = await fetch('https://api.airtable.com/v0/meta/whoami', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const user = await response.json();

            return {
                success: true,
                message: 'Airtable connection successful',
                user: {
                    id: user.id,
                    email: user.email
                }
            };

        } catch (error) {
            console.error('[ExternalDataService] Airtable test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Query Airtable table
     *
     * @param {string} sourceId - External source ID
     * @param {string} baseId - Airtable base ID
     * @param {string} tableId - Airtable table ID or name
     * @param {object} options - Query options (filterByFormula, maxRecords, view)
     * @returns {Promise<object>} Query result
     */
    async queryAirtable(sourceId, baseId, tableId, options = {}) {
        try {
            // Get source config
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            if (source.source_type !== 'airtable') {
                throw new Error('Source is not Airtable');
            }

            // Decrypt credentials if needed
            const config = JSON.parse(source.connection_config);
            if (source.credentials_encrypted && config.apiKey) {
                config.apiKey = await encryptionService.decrypt(config.apiKey);
            }

            // Build URL with query params
            const params = new URLSearchParams();
            if (options.filterByFormula) {
                params.append('filterByFormula', options.filterByFormula);
            }
            if (options.maxRecords) {
                params.append('maxRecords', options.maxRecords.toString());
            }
            if (options.view) {
                params.append('view', options.view);
            }

            const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                rows: data.records,
                rowCount: data.records.length,
                offset: data.offset
            };

        } catch (error) {
            console.error('[ExternalDataService] Airtable query failed:', error.message);
            throw error;
        }
    }

    /**
     * Import data from Airtable
     *
     * @param {string} sourceId - External source ID
     * @param {string} baseId - Airtable base ID
     * @param {string} tableId - Airtable table ID
     * @param {string} uid - User ID
     * @returns {Promise<object>} Import result
     */
    async importFromAirtable(sourceId, baseId, tableId, uid) {
        try {
            console.log(`[ExternalDataService] Starting Airtable import from source: ${sourceId}`);

            // Query Airtable
            const queryResult = await this.queryAirtable(sourceId, baseId, tableId, { maxRecords: 1000 });

            if (!queryResult.success) {
                throw new Error('Airtable query failed');
            }

            const records = queryResult.rows;
            console.log(`[ExternalDataService] Retrieved ${records.length} records from Airtable`);

            // Map and index each record
            const importId = uuidv4();
            const indexedContent = [];
            let successCount = 0;
            let errorCount = 0;

            for (const record of records) {
                try {
                    // Map Airtable record to indexable content
                    const content = this._mapAirtableRecordToContent(record);

                    // Index content
                    const indexed = await this._indexExternalContent(
                        content,
                        uid,
                        sourceId,
                        importId
                    );

                    if (indexed) {
                        indexedContent.push(indexed);
                        successCount++;
                    }
                } catch (error) {
                    console.error('[ExternalDataService] Failed to index Airtable record:', error.message);
                    errorCount++;
                }
            }

            // Record import history
            await this._recordImportHistory(importId, sourceId, uid, {
                baseId: baseId,
                tableId: tableId,
                totalRecords: records.length,
                successCount: successCount,
                errorCount: errorCount
            });

            // Update last_sync_at
            const now = Date.now();
            this.db.prepare(`
                UPDATE external_sources
                SET last_sync_at = ?, updated_at = ?
                WHERE id = ?
            `).run(now, now, sourceId);

            console.log(`[ExternalDataService] Airtable import completed: ${successCount} indexed, ${errorCount} errors`);

            return {
                success: true,
                importId: importId,
                totalRecords: records.length,
                indexedCount: successCount,
                errorCount: errorCount,
                indexedContent: indexedContent
            };

        } catch (error) {
            console.error('[ExternalDataService] Airtable import failed:', error.message);
            throw error;
        }
    }

    /**
     * Map Airtable record to indexable content
     * @private
     */
    _mapAirtableRecordToContent(record) {
        const fields = record.fields || {};

        // Try to find a title field
        let title = 'Airtable Record';
        const titleCandidates = ['Name', 'Title', 'name', 'title'];
        for (const candidate of titleCandidates) {
            if (fields[candidate]) {
                title = String(fields[candidate]);
                break;
            }
        }

        // Build content from all fields
        const contentParts = [];
        for (const [key, value] of Object.entries(fields)) {
            if (value !== null && value !== undefined) {
                let textValue;
                if (Array.isArray(value)) {
                    textValue = value.join(', ');
                } else if (typeof value === 'object') {
                    textValue = JSON.stringify(value);
                } else {
                    textValue = String(value);
                }
                contentParts.push(`${key}: ${textValue}`);
            }
        }

        return {
            title: title,
            content: contentParts.join('\n'),
            metadata: {
                airtableId: record.id,
                createdTime: record.createdTime
            },
            rawData: record
        };
    }

    // ========================================================================
    // EXTERNAL SOURCE MANAGEMENT
    // ========================================================================

    /**
     * Create or update external source
     *
     * @param {object} sourceData - Source configuration
     * @param {string} uid - User ID
     * @returns {Promise<string>} Source ID
     */
    async createOrUpdateExternalSource(sourceData, uid) {
        const {
            id = uuidv4(),
            source_name,
            source_type, // 'postgresql', 'mysql', 'rest_api'
            connection_config, // JSON object with connection details
            sync_enabled = 0,
            sync_frequency = null, // 'hourly', 'daily', 'weekly', null
            last_sync_at = null
        } = sourceData;

        if (!this.db) {
            await this.initialize();
        }

        // Encrypt sensitive credentials
        let configToStore = { ...connection_config };
        let credentialsEncrypted = 0;

        if (connection_config.password) {
            configToStore.password = await encryptionService.encrypt(connection_config.password);
            credentialsEncrypted = 1;
        }
        if (connection_config.authToken) {
            configToStore.authToken = await encryptionService.encrypt(connection_config.authToken);
            credentialsEncrypted = 1;
        }

        const now = Date.now();

        // Check if source exists
        const existing = this.db.prepare(`
            SELECT id FROM external_sources WHERE id = ?
        `).get(id);

        if (existing) {
            // Update
            this.db.prepare(`
                UPDATE external_sources
                SET source_name = ?,
                    source_type = ?,
                    connection_config = ?,
                    credentials_encrypted = ?,
                    sync_enabled = ?,
                    sync_frequency = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                source_name,
                source_type,
                JSON.stringify(configToStore),
                credentialsEncrypted,
                sync_enabled,
                sync_frequency,
                now,
                id
            );

            console.log(`[ExternalDataService] Updated external source: ${source_name}`);
        } else {
            // Create
            this.db.prepare(`
                INSERT INTO external_sources (
                    id, uid, source_name, source_type, connection_config,
                    credentials_encrypted, sync_enabled, sync_frequency,
                    last_sync_at, created_at, updated_at, sync_state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                uid,
                source_name,
                source_type,
                JSON.stringify(configToStore),
                credentialsEncrypted,
                sync_enabled,
                sync_frequency,
                last_sync_at,
                now,
                now,
                'clean'
            );

            console.log(`[ExternalDataService] Created external source: ${source_name}`);
        }

        return id;
    }

    /**
     * Get external source by ID
     * @private
     */
    async _getExternalSource(sourceId) {
        if (!this.db) {
            await this.initialize();
        }

        const source = this.db.prepare(`
            SELECT * FROM external_sources WHERE id = ?
        `).get(sourceId);

        return source;
    }

    /**
     * Get all external sources for a user
     *
     * @param {string} uid - User ID
     * @returns {Promise<object[]>} Array of sources
     */
    async getExternalSources(uid) {
        if (!this.db) {
            await this.initialize();
        }

        const sources = this.db.prepare(`
            SELECT id, source_name, source_type, sync_enabled,
                   sync_frequency, last_sync_at, created_at
            FROM external_sources
            WHERE uid = ?
            ORDER BY created_at DESC
        `).all(uid);

        return sources;
    }

    // ========================================================================
    // DATA IMPORT
    // ========================================================================

    /**
     * Import data from database and auto-index
     *
     * @param {string} sourceId - External source ID
     * @param {string} query - SQL query to execute
     * @param {object} mappingConfig - Column mapping configuration
     * @param {string} uid - User ID
     * @returns {Promise<object>} Import result
     */
    async importFromDatabase(sourceId, query, mappingConfig, uid) {
        try {
            console.log(`[ExternalDataService] Starting import from source: ${sourceId}`);

            // Get source
            const source = await this._getExternalSource(sourceId);
            if (!source) {
                throw new Error('External source not found');
            }

            // Execute query based on source type
            let queryResult;
            if (source.source_type === 'postgresql') {
                queryResult = await this.queryPostgres(sourceId, query);
            } else if (source.source_type === 'mysql') {
                queryResult = await this.queryMySQL(sourceId, query);
            } else {
                throw new Error(`Unsupported source type for SQL import: ${source.source_type}`);
            }

            if (!queryResult.success) {
                throw new Error('Query execution failed');
            }

            const rows = queryResult.rows;
            console.log(`[ExternalDataService] Retrieved ${rows.length} rows from database`);

            // Map and index each row
            const importId = uuidv4();
            const indexedContent = [];
            let successCount = 0;
            let errorCount = 0;

            for (const row of rows) {
                try {
                    // Map row to indexable content
                    const content = this._mapRowToContent(row, mappingConfig);

                    // Index content
                    const indexed = await this._indexExternalContent(
                        content,
                        uid,
                        sourceId,
                        importId
                    );

                    if (indexed) {
                        indexedContent.push(indexed);
                        successCount++;
                    }
                } catch (error) {
                    console.error('[ExternalDataService] Failed to index row:', error.message);
                    errorCount++;
                }
            }

            // Record import history
            await this._recordImportHistory(importId, sourceId, uid, {
                query: query,
                totalRows: rows.length,
                successCount: successCount,
                errorCount: errorCount
            });

            // Update last_sync_at
            const now = Date.now();
            this.db.prepare(`
                UPDATE external_sources
                SET last_sync_at = ?, updated_at = ?
                WHERE id = ?
            `).run(now, now, sourceId);

            console.log(`[ExternalDataService] Import completed: ${successCount} indexed, ${errorCount} errors`);

            return {
                success: true,
                importId: importId,
                totalRows: rows.length,
                indexedCount: successCount,
                errorCount: errorCount,
                indexedContent: indexedContent
            };

        } catch (error) {
            console.error('[ExternalDataService] Import failed:', error.message);
            throw error;
        }
    }

    /**
     * Map database row to indexable content
     * @private
     */
    _mapRowToContent(row, mappingConfig) {
        const {
            titleColumn = null,
            contentColumns = [],
            metadataColumns = []
        } = mappingConfig;

        // Build title
        let title = 'Imported Data';
        if (titleColumn && row[titleColumn]) {
            title = String(row[titleColumn]);
        }

        // Build content text from specified columns
        let contentText = '';
        if (contentColumns.length > 0) {
            contentText = contentColumns
                .map(col => row[col] ? String(row[col]) : '')
                .filter(text => text.length > 0)
                .join('\n\n');
        } else {
            // If no columns specified, use all columns
            contentText = Object.entries(row)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
        }

        // Extract metadata
        const metadata = {};
        metadataColumns.forEach(col => {
            if (row[col] !== undefined) {
                metadata[col] = row[col];
            }
        });

        return {
            title: title,
            content: contentText,
            metadata: metadata,
            rawData: row
        };
    }

    /**
     * Index external content using autoIndexingService
     * @private
     */
    async _indexExternalContent(content, uid, sourceId, importId) {
        try {
            // Use autoIndexingService to index the content
            // We'll create a "virtual" content entry that looks like a document

            const contentId = uuidv4();

            // Extract entities and generate summary using knowledgeOrganizerService
            const knowledgeOrganizer = require('./knowledgeOrganizerService');

            const entities = await knowledgeOrganizer.extractEntities(content.content);
            const summary = await knowledgeOrganizer.generateSummary(content.content, 50);
            const tags = await knowledgeOrganizer.generateTags(content.content, 5);

            // Save entities to knowledge graph
            for (const project of (entities.projects || []).slice(0, 5)) {
                await knowledgeOrganizer.createOrUpdateEntity({
                    entity_type: 'project',
                    entity_name: project,
                    related_content_id: contentId
                }, uid);
            }

            for (const person of (entities.people || []).slice(0, 10)) {
                await knowledgeOrganizer.createOrUpdateEntity({
                    entity_type: 'person',
                    entity_name: person,
                    related_content_id: contentId
                }, uid);
            }

            // Calculate importance
            const importanceScore = 0.7; // External data is moderately important by default

            // Save to auto_indexed_content
            const now = Date.now();

            this.db.prepare(`
                INSERT INTO auto_indexed_content (
                    id, uid, source_type, source_id, source_title,
                    content, content_summary, raw_content,
                    entities, tags, project,
                    importance_score, embedding,
                    auto_generated, indexed_at,
                    created_at, updated_at, sync_state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                contentId,
                uid,
                'external_database',
                sourceId,
                content.title,
                content.content,
                summary,
                JSON.stringify(content.rawData),
                JSON.stringify(entities),
                JSON.stringify(tags),
                entities.projects && entities.projects.length > 0 ? entities.projects[0] : null,
                importanceScore,
                null, // embedding will be generated later
                1,
                now,
                now,
                now,
                'clean'
            );

            console.log(`[ExternalDataService] Indexed external content: ${content.title}`);

            return {
                id: contentId,
                title: content.title,
                summary: summary
            };

        } catch (error) {
            console.error('[ExternalDataService] Failed to index content:', error.message);
            throw error;
        }
    }

    /**
     * Record import history
     * @private
     */
    async _recordImportHistory(importId, sourceId, uid, stats) {
        if (!this.db) {
            await this.initialize();
        }

        const now = Date.now();

        this.db.prepare(`
            INSERT INTO import_history (
                id, uid, source_id, import_type,
                records_imported, records_failed,
                import_config, error_log,
                started_at, completed_at,
                created_at, updated_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            importId,
            uid,
            sourceId,
            'database_query',
            stats.successCount,
            stats.errorCount,
            JSON.stringify({ query: stats.query }),
            null,
            now,
            now,
            now,
            now,
            'clean'
        );

        console.log(`[ExternalDataService] Recorded import history: ${importId}`);
    }

    /**
     * Get import history for a source
     *
     * @param {string} sourceId - External source ID
     * @param {number} limit - Max number of records
     * @returns {Promise<object[]>} Import history
     */
    async getImportHistory(sourceId, limit = 10) {
        if (!this.db) {
            await this.initialize();
        }

        const history = this.db.prepare(`
            SELECT * FROM import_history
            WHERE source_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(sourceId, limit);

        return history;
    }
}

// Export singleton instance
const externalDataService = new ExternalDataService();
module.exports = externalDataService;
