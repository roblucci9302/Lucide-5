/**
 * ID Generator Utility
 * Centralized ID and timestamp generation to eliminate code duplication
 *
 * Previously duplicated across 93+ files with pattern:
 *   const id = require('crypto').randomUUID();
 *   const now = Math.floor(Date.now() / 1000);
 */

const crypto = require('crypto');

/**
 * Generate a unique UUID v4 identifier
 * @returns {string} UUID v4 string
 */
function generateId() {
    return crypto.randomUUID();
}

/**
 * Get current Unix timestamp in seconds
 * @returns {number} Unix timestamp (seconds)
 */
function getTimestamp() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Get current Unix timestamp in milliseconds
 * @returns {number} Unix timestamp (milliseconds)
 */
function getTimestampMs() {
    return Date.now();
}

/**
 * Create a new record with standard fields (id, created_at, updated_at)
 * @param {Object} data - Additional data to include in the record
 * @returns {Object} Record with id and timestamps
 */
function createRecord(data = {}) {
    const now = getTimestamp();
    return {
        id: generateId(),
        created_at: now,
        updated_at: now,
        ...data
    };
}

/**
 * Create timestamp fields for updating a record
 * @returns {Object} Object with updated_at timestamp
 */
function updateTimestamp() {
    return {
        updated_at: getTimestamp()
    };
}

/**
 * Generate a short ID (first 8 characters of UUID)
 * Useful for display purposes where full UUID is too long
 * @returns {string} Short ID
 */
function generateShortId() {
    return generateId().substring(0, 8);
}

/**
 * Generate a prefixed ID for specific entity types
 * @param {string} prefix - Prefix to add (e.g., 'sess', 'msg', 'doc')
 * @returns {string} Prefixed ID like 'sess_abc123...'
 */
function generatePrefixedId(prefix) {
    return `${prefix}_${generateId()}`;
}

module.exports = {
    generateId,
    getTimestamp,
    getTimestampMs,
    createRecord,
    updateTimestamp,
    generateShortId,
    generatePrefixedId
};
