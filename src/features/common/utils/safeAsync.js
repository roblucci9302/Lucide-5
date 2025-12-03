/**
 * Safe Async Utilities
 *
 * Provides wrappers for non-critical async operations with proper logging
 * instead of silent error suppression.
 */

const { createLogger } = require('./logger');

const logger = createLogger('SafeAsync');

/**
 * Execute a promise and log any errors without throwing
 * Use for non-critical operations like cleanup, temp file deletion, etc.
 *
 * @param {Promise} promise - The promise to execute
 * @param {string} context - Context description for logging
 * @returns {Promise<any>} - Resolves with result or undefined on error
 */
async function safeAsync(promise, context = 'unknown') {
    try {
        return await promise;
    } catch (error) {
        logger.warn(`[${context}] Non-critical operation failed: ${error.message}`);
        return undefined;
    }
}

/**
 * Execute a function and log any errors without throwing
 * Use for non-critical sync or async operations
 *
 * @param {Function} fn - The function to execute
 * @param {string} context - Context description for logging
 * @returns {Promise<any>} - Resolves with result or undefined on error
 */
async function safeExec(fn, context = 'unknown') {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return await result;
        }
        return result;
    } catch (error) {
        logger.warn(`[${context}] Non-critical operation failed: ${error.message}`);
        return undefined;
    }
}

/**
 * Create a catch handler that logs instead of silencing
 * Use to replace .catch(() => {}) patterns
 *
 * @param {string} context - Context description for logging
 * @returns {Function} - Error handler function
 */
function loggedCatch(context = 'unknown') {
    return (error) => {
        logger.warn(`[${context}] Error caught: ${error.message}`);
    };
}

/**
 * Create a catch handler that logs and returns a default value
 *
 * @param {string} context - Context description for logging
 * @param {any} defaultValue - Value to return on error
 * @returns {Function} - Error handler function
 */
function loggedCatchWithDefault(context, defaultValue) {
    return (error) => {
        logger.warn(`[${context}] Error caught, returning default: ${error.message}`);
        return defaultValue;
    };
}

module.exports = {
    safeAsync,
    safeExec,
    loggedCatch,
    loggedCatchWithDefault
};
