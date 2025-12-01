/**
 * Input Validation Utilities
 *
 * Centralized validation functions to ensure data integrity and security.
 */

/**
 * Validation error class
 */
class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Document metadata validator
 */
class DocumentValidator {
    /**
     * Validate document upload metadata
     * @param {Object} metadata - Document metadata
     * @returns {Object} { valid: boolean, errors: Array<string> }
     */
    static validateMetadata(metadata = {}) {
        const errors = [];

        // Title validation
        if (metadata.title) {
            if (typeof metadata.title !== 'string') {
                errors.push('Title must be a string');
            } else if (metadata.title.length > 200) {
                errors.push('Title too long (max 200 characters)');
            } else if (metadata.title.length === 0) {
                errors.push('Title cannot be empty');
            }
        }

        // Tags validation
        if (metadata.tags) {
            if (!Array.isArray(metadata.tags)) {
                errors.push('Tags must be an array');
            } else if (metadata.tags.length > 20) {
                errors.push('Too many tags (max 20)');
            } else {
                // Validate each tag
                metadata.tags.forEach((tag, idx) => {
                    if (typeof tag !== 'string') {
                        errors.push(`Tag at index ${idx} must be a string`);
                    } else if (tag.length > 50) {
                        errors.push(`Tag "${tag}" too long (max 50 characters)`);
                    }
                });
            }
        }

        // Description validation
        if (metadata.description) {
            if (typeof metadata.description !== 'string') {
                errors.push('Description must be a string');
            } else if (metadata.description.length > 1000) {
                errors.push('Description too long (max 1000 characters)');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate file upload
     * @param {Object} fileData - File data { filename, buffer }
     * @returns {Object} { valid: boolean, errors: Array<string> }
     */
    static validateFile(fileData) {
        const errors = [];

        if (!fileData) {
            errors.push('File data is required');
            return { valid: false, errors };
        }

        // Filename validation
        if (!fileData.filename || typeof fileData.filename !== 'string') {
            errors.push('Valid filename is required');
        } else if (fileData.filename.length > 255) {
            errors.push('Filename too long (max 255 characters)');
        }

        // Buffer validation
        if (!fileData.buffer || !Buffer.isBuffer(fileData.buffer)) {
            errors.push('Valid file buffer is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

/**
 * Session metadata validator
 */
class SessionValidator {
    /**
     * Validate session metadata
     * @param {Object} metadata - Session metadata
     * @returns {Object} { valid: boolean, errors: Array<string> }
     */
    static validateMetadata(metadata = {}) {
        const errors = [];

        // Title validation
        if (metadata.title !== undefined) {
            if (typeof metadata.title !== 'string') {
                errors.push('Title must be a string');
            } else if (metadata.title.length > 200) {
                errors.push('Title too long (max 200 characters)');
            }
        }

        // Tags validation
        if (metadata.tags !== undefined) {
            if (!Array.isArray(metadata.tags)) {
                errors.push('Tags must be an array');
            } else if (metadata.tags.length > 10) {
                errors.push('Too many tags (max 10)');
            }
        }

        // Description validation
        if (metadata.description !== undefined) {
            if (typeof metadata.description !== 'string') {
                errors.push('Description must be a string');
            } else if (metadata.description.length > 500) {
                errors.push('Description too long (max 500 characters)');
            }
        }

        // Agent profile validation
        if (metadata.agent_profile !== undefined) {
            const VALID_PROFILES = ['lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert'];
            if (!VALID_PROFILES.includes(metadata.agent_profile)) {
                errors.push(`Invalid agent profile: ${metadata.agent_profile}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

/**
 * Query options validator
 */
class QueryValidator {
    /**
     * Validate query options (limit, offset, etc.)
     * @param {Object} options - Query options
     * @returns {Object} Sanitized options
     */
    static validateQueryOptions(options = {}) {
        const sanitized = {};

        // Limit validation (max 100)
        if (options.limit !== undefined) {
            const limit = parseInt(options.limit, 10);
            sanitized.limit = isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100);
        }

        // Offset validation
        if (options.offset !== undefined) {
            const offset = parseInt(options.offset, 10);
            sanitized.offset = isNaN(offset) ? 0 : Math.max(0, offset);
        }

        // sortBy validation (handled separately per service with whitelists)
        if (options.sortBy !== undefined) {
            sanitized.sortBy = String(options.sortBy);
        }

        // order validation
        if (options.order !== undefined) {
            const order = String(options.order).toUpperCase();
            sanitized.order = ['ASC', 'DESC'].includes(order) ? order : 'DESC';
        }

        return sanitized;
    }

    /**
     * Validate search query
     * @param {string} query - Search query
     * @returns {Object} { valid: boolean, sanitized: string, errors: Array }
     */
    static validateSearchQuery(query) {
        const errors = [];

        if (!query) {
            return { valid: true, sanitized: '', errors: [] };
        }

        if (typeof query !== 'string') {
            errors.push('Query must be a string');
            return { valid: false, sanitized: '', errors };
        }

        if (query.length > 500) {
            errors.push('Query too long (max 500 characters)');
            return { valid: false, sanitized: '', errors };
        }

        // Trim whitespace
        const sanitized = query.trim();

        return {
            valid: errors.length === 0,
            sanitized,
            errors
        };
    }
}

/**
 * RAG options validator
 */
class RAGValidator {
    /**
     * Validate RAG retrieval options
     * @param {Object} options - RAG options
     * @returns {Object} Sanitized options
     */
    static validateRetrievalOptions(options = {}) {
        const sanitized = {};

        // Max chunks validation (1-20)
        if (options.maxChunks !== undefined) {
            const maxChunks = parseInt(options.maxChunks, 10);
            sanitized.maxChunks = isNaN(maxChunks) ? 5 : Math.min(Math.max(1, maxChunks), 20);
        }

        // Min score validation (0-1)
        if (options.minScore !== undefined) {
            const minScore = parseFloat(options.minScore);
            sanitized.minScore = isNaN(minScore) ? 0.7 : Math.min(Math.max(0, minScore), 1);
        }

        // Document IDs validation
        if (options.documentIds !== undefined) {
            if (Array.isArray(options.documentIds)) {
                // Filter out non-string IDs and limit to 100
                sanitized.documentIds = options.documentIds
                    .filter(id => typeof id === 'string')
                    .slice(0, 100);
            }
        }

        return sanitized;
    }
}

module.exports = {
    ValidationError,
    DocumentValidator,
    SessionValidator,
    QueryValidator,
    RAGValidator
};
