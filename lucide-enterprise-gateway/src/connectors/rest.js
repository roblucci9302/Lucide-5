/**
 * REST API Connector
 * Generic connector for REST APIs
 */

const axios = require('axios');

class RESTConnector {
    constructor(config) {
        this.config = config;
        this.client = null;
    }

    /**
     * Connect to REST API (setup axios instance)
     */
    async connect() {
        this.client = axios.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout || 10000,
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
                ...this.config.headers
            }
        });

        // Test connection
        const healthEndpoint = this.config.healthEndpoint || '/health';
        try {
            await this.client.get(healthEndpoint);
            console.log(`[REST] Connected to ${this.config.baseURL}`);
        } catch (error) {
            console.warn(`[REST] Warning: Health check failed for ${this.config.baseURL}`);
            // Continue anyway - health endpoint might not exist
        }
    }

    /**
     * Execute REST query (HTTP request)
     * Query format: { method, endpoint, params, data }
     */
    async execute(query, params = []) {
        if (!this.client) {
            throw new Error('REST client not initialized');
        }

        try {
            // Parse query if it's a string (JSON)
            let request = typeof query === 'string' ? JSON.parse(query) : query;

            // Execute request
            const response = await this.client.request({
                method: request.method || 'GET',
                url: request.endpoint,
                params: request.params || {},
                data: request.data || null
            });

            return {
                rows: Array.isArray(response.data) ? response.data : [response.data],
                rowCount: Array.isArray(response.data) ? response.data.length : 1,
                status: response.status,
                headers: response.headers
            };
        } catch (error) {
            console.error('[REST] Request error:', error.message);
            throw new Error(`REST request failed: ${error.message}`);
        }
    }

    /**
     * Get API schema (if available via OpenAPI/Swagger)
     */
    async getSchema() {
        try {
            const schemaEndpoint = this.config.schemaEndpoint || '/openapi.json';
            const response = await this.client.get(schemaEndpoint);
            return response.data;
        } catch (error) {
            console.warn('[REST] Schema not available');
            return {
                message: 'Schema not available for this REST API',
                baseURL: this.config.baseURL
            };
        }
    }

    /**
     * Get available endpoints (if schema exists)
     */
    async getTables() {
        try {
            const schema = await this.getSchema();
            if (schema.paths) {
                return Object.keys(schema.paths);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Disconnect (cleanup)
     */
    async disconnect() {
        this.client = null;
        console.log('[REST] Disconnected');
    }
}

module.exports = RESTConnector;
