/**
 * Lucide Enterprise Gateway - Configuration Example
 *
 * This file shows how to configure the gateway programmatically.
 * You can use this instead of .env file for more complex configurations.
 */

module.exports = {
    // Server settings
    server: {
        port: process.env.PORT || 3002,
        host: '0.0.0.0',
        apiVersion: 'v1'
    },

    // JWT Authentication
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '24h',
        issuer: 'lucide-enterprise-gateway',
        audience: 'lucide-clients'
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100, // 100 requests per minute
        skipSuccessfulRequests: false,
        message: 'Too many requests from this IP, please try again later'
    },

    // Audit Logging
    audit: {
        enabled: true,
        logLevel: 'info',
        logToFile: true,
        logFilePath: './logs/audit.log',
        rotateDaily: true,
        maxFileSizeMB: 100
    },

    // CORS Configuration
    cors: {
        origin: [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://your-lucide-app.com'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },

    // Database Connections
    databases: {
        // PostgreSQL - Production Database
        'postgres-prod': {
            type: 'postgresql',
            host: 'your-postgres-host.com',
            port: 5432,
            database: 'production_db',
            user: 'readonly_user',
            password: process.env.DB_POSTGRES_PROD_PASSWORD,
            ssl: true,
            readOnly: true,
            maxConnections: 10,
            connectionTimeout: 30000,
            idleTimeout: 60000
        },

        // MySQL - HR Database
        'mysql-hr': {
            type: 'mysql',
            host: 'hr-mysql.company.com',
            port: 3306,
            database: 'hr_database',
            user: 'hr_readonly',
            password: process.env.DB_MYSQL_HR_PASSWORD,
            readOnly: true,
            maxConnections: 5
        },

        // MySQL - Finance Database
        'mysql-finance': {
            type: 'mysql',
            host: 'finance-mysql.company.com',
            port: 3306,
            database: 'finance_db',
            user: 'finance_readonly',
            password: process.env.DB_MYSQL_FINANCE_PASSWORD,
            readOnly: true,
            maxConnections: 5
        },

        // REST API - CRM
        'rest-crm': {
            type: 'rest',
            baseURL: 'https://api.your-crm.com',
            authType: 'bearer',
            authToken: process.env.CRM_API_TOKEN,
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        },

        // REST API - Marketing Platform
        'rest-marketing': {
            type: 'rest',
            baseURL: 'https://api.marketing-platform.com',
            authType: 'apikey',
            apiKey: process.env.MARKETING_API_KEY,
            apiKeyHeader: 'X-API-Key'
        }
    },

    // User Permissions
    // Define which users can access which databases
    permissions: {
        // Admin has access to everything
        'admin': ['*'],

        // HR team can access HR database
        'hr-team': ['mysql-hr'],

        // Finance team can access finance database
        'finance-team': ['mysql-finance'],

        // Developers can access production (read-only)
        'developers': ['postgres-prod'],

        // Marketing team can access CRM and marketing APIs
        'marketing-team': ['rest-crm', 'rest-marketing']
    },

    // LLM Configuration (for Natural Language to SQL)
    llm: {
        provider: 'openai',
        apiKey: process.env.LLM_API_KEY,
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 500,
        systemPrompt: `You are a SQL expert. Convert natural language questions to SQL queries.
        Only generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DROP queries.
        Return only valid SQL without explanations.`
    },

    // Security Settings
    security: {
        maxQueryExecutionTime: 30000, // 30 seconds
        allowWriteQueries: false,
        blockDangerousKeywords: true,
        requireAuthentication: true,
        enforceReadOnly: true,
        maxResultRows: 10000,
        sanitizeInputs: true
    },

    // Monitoring & Performance
    monitoring: {
        enableMetrics: true,
        enableHealthCheck: true,
        logQueries: true,
        logSlowQueries: true,
        slowQueryThresholdMs: 5000
    }
};
