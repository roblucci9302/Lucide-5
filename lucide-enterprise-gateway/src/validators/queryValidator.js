/**
 * Query Validator
 * Validates SQL queries for safety and security
 */

class QueryValidator {
    constructor() {
        // Dangerous SQL keywords that should be blocked
        this.dangerousKeywords = [
            'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE',
            'INSERT', 'UPDATE', 'GRANT', 'REVOKE',
            'EXEC', 'EXECUTE', 'xp_', 'sp_'
        ];

        // Suspicious patterns
        this.suspiciousPatterns = [
            /;.*?(DROP|DELETE|TRUNCATE|ALTER)/i,  // SQL injection attempts
            /UNION.*?SELECT/i,                     // UNION-based injection
            /--.*/,                                // Comment-based injection
            /\/\*.*?\*\//,                         // Block comments
            /\bOR\s+1\s*=\s*1/i,                   // Classic injection
            /\bAND\s+1\s*=\s*1/i                   // Classic injection
        ];
    }

    /**
     * Validate SQL query safety
     * @param {string} query - SQL query to validate
     * @param {Object} options - Validation options
     * @returns {Object} { safe: boolean, reason?: string }
     */
    validate(query, options = {}) {
        if (!query || typeof query !== 'string') {
            return {
                safe: false,
                reason: 'Query must be a non-empty string'
            };
        }

        const upperQuery = query.toUpperCase().trim();

        // Check if read-only mode is enforced
        if (options.readOnly) {
            // Only SELECT queries allowed
            if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
                return {
                    safe: false,
                    reason: 'Only SELECT queries are allowed in read-only mode'
                };
            }

            // Check for dangerous keywords
            for (const keyword of this.dangerousKeywords) {
                if (upperQuery.includes(keyword)) {
                    return {
                        safe: false,
                        reason: `Dangerous keyword detected: ${keyword}`
                    };
                }
            }
        }

        // Check for suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
            if (pattern.test(query)) {
                return {
                    safe: false,
                    reason: 'Suspicious pattern detected - possible SQL injection attempt'
                };
            }
        }

        // Check for multiple statements (semicolon abuse)
        const statements = query.split(';').filter(s => s.trim().length > 0);
        if (statements.length > 1) {
            return {
                safe: false,
                reason: 'Multiple statements not allowed'
            };
        }

        // Passed all checks
        return {
            safe: true
        };
    }

    /**
     * Sanitize SQL query (basic sanitization)
     * @param {string} query - SQL query
     * @returns {string} Sanitized query
     */
    sanitize(query) {
        // Remove comments
        let sanitized = query.replace(/--.*$/gm, '');
        sanitized = sanitized.replace(/\/\*.*?\*\//gs, '');

        // Trim whitespace
        sanitized = sanitized.trim();

        return sanitized;
    }

    /**
     * Validate table and column names (prevent SQL injection)
     * @param {string} name - Table or column name
     * @returns {boolean}
     */
    isValidIdentifier(name) {
        // Only allow alphanumeric, underscore, and dot
        const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
        return validPattern.test(name);
    }
}

module.exports = QueryValidator;
