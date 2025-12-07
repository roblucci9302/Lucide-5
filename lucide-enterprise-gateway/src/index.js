/**
 * Lucide Enterprise Gateway
 *
 * Secure API Gateway for connecting Lucide to enterprise databases
 *
 * Features:
 * - Multi-database support (PostgreSQL, MySQL, REST APIs)
 * - JWT authentication
 * - Rate limiting
 * - Audit logging
 * - Query validation and sanitization
 * - Row-level permissions
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const DatabaseConnectors = require('./connectors');
const AuditLogger = require('./audit');
const QueryValidator = require('./validators/queryValidator');

class LucideEnterpriseGateway {
    constructor(config = {}) {
        this.app = express();
        this.config = this.validateConfig(config);
        this.databases = new Map();
        this.auditLogger = new AuditLogger(config.audit);
        this.queryValidator = new QueryValidator();

        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Validate gateway configuration
     */
    validateConfig(config) {
        const schema = Joi.object({
            port: Joi.number().default(3000),
            jwtSecret: Joi.string().required(),
            databases: Joi.array().items(
                Joi.object({
                    name: Joi.string().required(),
                    type: Joi.string().valid('postgresql', 'mysql', 'rest').required(),
                    connection: Joi.object().required(),
                    tables: Joi.array().items(Joi.string()).default([]),
                    readOnly: Joi.boolean().default(true)
                })
            ).default([]),
            rateLimit: Joi.object({
                windowMs: Joi.number().default(60000),
                max: Joi.number().default(100)
            }).default(),
            permissions: Joi.object().default({}),
            audit: Joi.object({
                enabled: Joi.boolean().default(true),
                logLevel: Joi.string().valid('info', 'warn', 'error').default('info')
            }).default()
        });

        const { error, value } = schema.validate(config);
        if (error) {
            throw new Error(`Configuration error: ${error.message}`);
        }

        return value;
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Security headers
        this.app.use(helmet());

        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
            credentials: true
        }));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Logging
        if (process.env.NODE_ENV !== 'test') {
            this.app.use(morgan('combined'));
        }

        // Rate limiting
        const limiter = rateLimit({
            windowMs: this.config.rateLimit.windowMs,
            max: this.config.rateLimit.max,
            message: 'Too many requests, please try again later',
            standardHeaders: true,
            legacyHeaders: false
        });

        this.app.use('/api/', limiter);

        // JWT Authentication middleware
        this.app.use('/api/', this.authenticateJWT.bind(this));
    }

    /**
     * JWT Authentication middleware
     */
    authenticateJWT(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            });
        }

        jwt.verify(token, this.config.jwtSecret, (err, user) => {
            if (err) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Invalid or expired token'
                });
            }

            req.user = user;
            next();
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                databases: Array.from(this.databases.keys()),
                timestamp: Date.now()
            });
        });

        // Gateway info
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Lucide Enterprise Gateway',
                version: '1.0.0',
                databases: Array.from(this.databases.keys()),
                endpoints: {
                    query: 'POST /api/query',
                    schema: 'GET /api/schema/:database',
                    tables: 'GET /api/tables/:database'
                }
            });
        });

        // Execute query
        this.app.post('/api/query', this.handleQuery.bind(this));

        // Get database schema
        this.app.get('/api/schema/:database', this.handleGetSchema.bind(this));

        // Get available tables
        this.app.get('/api/tables/:database', this.handleGetTables.bind(this));

        // Natural language query (Question → SQL)
        this.app.post('/api/ask', this.handleNaturalLanguageQuery.bind(this));

        // Error handler
        this.app.use(this.errorHandler.bind(this));
    }

    /**
     * Handle SQL query execution
     */
    async handleQuery(req, res, next) {
        try {
            const { database, query, params = [] } = req.body;

            // Validate request
            if (!database || !query) {
                return res.status(400).json({
                    error: 'ValidationError',
                    message: 'Database and query are required'
                });
            }

            // Check permissions
            if (!this.hasPermission(req.user, database)) {
                this.auditLogger.log('warn', 'Permission denied', {
                    user: req.user.email,
                    database,
                    query
                });

                return res.status(403).json({
                    error: 'PermissionDenied',
                    message: 'You do not have access to this database'
                });
            }

            // Validate query safety
            const validation = this.queryValidator.validate(query, {
                readOnly: this.getDatabaseConfig(database)?.readOnly || true
            });

            if (!validation.safe) {
                this.auditLogger.log('warn', 'Unsafe query blocked', {
                    user: req.user.email,
                    database,
                    query,
                    reason: validation.reason
                });

                return res.status(400).json({
                    error: 'UnsafeQuery',
                    message: validation.reason
                });
            }

            // Get database connector
            const db = this.databases.get(database);
            if (!db) {
                return res.status(404).json({
                    error: 'NotFound',
                    message: 'Database not found'
                });
            }

            // Execute query
            const startTime = Date.now();
            const result = await db.execute(query, params);
            const duration = Date.now() - startTime;

            // Audit log
            this.auditLogger.log('info', 'Query executed', {
                user: req.user.email,
                database,
                query: query.substring(0, 200),
                duration,
                rowCount: result.rows?.length || result.length || 0
            });

            res.json({
                success: true,
                data: result.rows || result,
                rowCount: result.rowCount || result.length,
                duration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle natural language query (Question → SQL)
     */
    async handleNaturalLanguageQuery(req, res, next) {
        try {
            const { database, question, llmConfig } = req.body;

            if (!database || !question) {
                return res.status(400).json({
                    error: 'ValidationError',
                    message: 'Database and question are required'
                });
            }

            // Check permissions
            if (!this.hasPermission(req.user, database)) {
                return res.status(403).json({
                    error: 'PermissionDenied',
                    message: 'You do not have access to this database'
                });
            }

            // Get database schema
            const db = this.databases.get(database);
            if (!db) {
                return res.status(404).json({
                    error: 'NotFound',
                    message: 'Database not found'
                });
            }

            const schema = await db.getSchema();

            // Convert question to SQL using LLM
            const sql = await this.questionToSQL(question, schema, llmConfig);

            // Validate generated SQL
            const validation = this.queryValidator.validate(sql, {
                readOnly: this.getDatabaseConfig(database)?.readOnly || true
            });

            if (!validation.safe) {
                return res.status(400).json({
                    error: 'UnsafeQuery',
                    message: 'Generated SQL query is not safe: ' + validation.reason
                });
            }

            // Execute query
            const result = await db.execute(sql);

            // Audit log
            this.auditLogger.log('info', 'Natural language query executed', {
                user: req.user.email,
                database,
                question,
                generatedSQL: sql,
                rowCount: result.rows?.length || result.length || 0
            });

            res.json({
                success: true,
                question,
                sql,
                data: result.rows || result,
                rowCount: result.rowCount || result.length
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Convert natural language question to SQL using LLM
     */
    async questionToSQL(question, schema, llmConfig = {}) {
        const axios = require('axios');

        // Build prompt for LLM
        const prompt = `You are a SQL expert. Convert the following question into a SQL query.

Database Schema:
${JSON.stringify(schema, null, 2)}

Question: "${question}"

Rules:
- Only generate SELECT queries (no INSERT, UPDATE, DELETE, DROP)
- Use proper table and column names from the schema
- Include appropriate WHERE clauses, JOINs, and filters
- Limit results to 100 rows maximum
- Return ONLY the SQL query, no explanations

SQL Query:`;

        // Call LLM API (OpenAI by default, configurable)
        const apiUrl = llmConfig.apiUrl || process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
        const apiKey = llmConfig.apiKey || process.env.LLM_API_KEY;
        const model = llmConfig.model || process.env.LLM_MODEL || 'gpt-4o-mini';

        if (!apiKey) {
            throw new Error('LLM API key not configured');
        }

        const response = await axios.post(
            apiUrl,
            {
                model,
                messages: [
                    { role: 'system', content: 'You are a SQL expert assistant.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let sql = response.data.choices[0].message.content.trim();

        // Clean up SQL (remove markdown code blocks if present)
        sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

        // Ensure LIMIT clause
        if (!sql.toUpperCase().includes('LIMIT')) {
            sql += ' LIMIT 100';
        }

        return sql;
    }

    /**
     * Get database schema
     */
    async handleGetSchema(req, res, next) {
        try {
            const { database } = req.params;

            if (!this.hasPermission(req.user, database)) {
                return res.status(403).json({
                    error: 'PermissionDenied',
                    message: 'You do not have access to this database'
                });
            }

            const db = this.databases.get(database);
            if (!db) {
                return res.status(404).json({
                    error: 'NotFound',
                    message: 'Database not found'
                });
            }

            const schema = await db.getSchema();

            res.json({ database, schema });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get available tables
     */
    async handleGetTables(req, res, next) {
        try {
            const { database } = req.params;

            if (!this.hasPermission(req.user, database)) {
                return res.status(403).json({
                    error: 'PermissionDenied',
                    message: 'You do not have access to this database'
                });
            }

            const db = this.databases.get(database);
            if (!db) {
                return res.status(404).json({
                    error: 'NotFound',
                    message: 'Database not found'
                });
            }

            const tables = await db.getTables();

            res.json({ database, tables });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Check if user has permission to access database
     */
    hasPermission(user, database) {
        const permissions = this.config.permissions || {};
        const userPermissions = permissions[user.email] || [];

        return userPermissions.includes(database) || userPermissions.includes('*');
    }

    /**
     * Get database configuration
     */
    getDatabaseConfig(databaseName) {
        return this.config.databases.find(db => db.name === databaseName);
    }

    /**
     * Connect to a database
     */
    async connectDatabase(dbConfig) {
        try {
            const { type, name, connection } = dbConfig;

            console.log(`[Gateway] Connecting to ${type} database: ${name}`);

            let connector;
            switch (type) {
                case 'postgresql':
                    connector = new DatabaseConnectors.PostgreSQLConnector(connection);
                    break;
                case 'mysql':
                    connector = new DatabaseConnectors.MySQLConnector(connection);
                    break;
                case 'rest':
                    connector = new DatabaseConnectors.RESTConnector(connection);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${type}`);
            }

            await connector.connect();
            this.databases.set(name, connector);

            console.log(`[Gateway] ✅ Connected to ${type} database: ${name}`);
            return true;
        } catch (error) {
            console.error(`[Gateway] ❌ Failed to connect to ${dbConfig.name}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from a database
     */
    async disconnectDatabase(name) {
        const db = this.databases.get(name);
        if (db) {
            await db.disconnect();
            this.databases.delete(name);
            console.log(`[Gateway] Disconnected from database: ${name}`);
        }
    }

    /**
     * Error handler
     */
    errorHandler(err, req, res, next) {
        console.error('[Gateway] Error:', err);

        this.auditLogger.log('error', 'Request error', {
            user: req.user?.email,
            error: err.message,
            stack: err.stack
        });

        res.status(err.status || 500).json({
            error: err.name || 'ServerError',
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        });
    }

    /**
     * Start the gateway server
     */
    async start() {
        try {
            // Connect to all configured databases
            for (const dbConfig of this.config.databases) {
                await this.connectDatabase(dbConfig);
            }

            // Start Express server
            const port = this.config.port;
            this.server = this.app.listen(port, () => {
                console.log('═'.repeat(60));
                console.log('🔌 Lucide Enterprise Gateway');
                console.log('═'.repeat(60));
                console.log(`Port: ${port}`);
                console.log(`Databases: ${Array.from(this.databases.keys()).join(', ')}`);
                console.log(`Health check: http://localhost:${port}/health`);
                console.log('═'.repeat(60));
            });

            return this.server;
        } catch (error) {
            console.error('[Gateway] Failed to start:', error);
            throw error;
        }
    }

    /**
     * Stop the gateway server
     */
    async stop() {
        // Disconnect from all databases
        for (const [name] of this.databases) {
            await this.disconnectDatabase(name);
        }

        // Stop server
        if (this.server) {
            this.server.close();
            console.log('[Gateway] Server stopped');
        }
    }
}

module.exports = LucideEnterpriseGateway;
