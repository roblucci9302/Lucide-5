/**
 * IPC Handler Utilities
 *
 * Provides standardized wrappers for IPC handlers to eliminate code duplication
 * across bridge modules. Reduces ~186 duplicate try-catch patterns.
 */

const { ipcMain } = require('electron');
const { createLogger } = require('../../features/common/utils/logger');

const logger = createLogger('IPCHandler');

/**
 * Create a standardized IPC handler with automatic error handling
 *
 * @param {string} channel - IPC channel name
 * @param {Function} handler - Async handler function
 * @param {Object} options - Options
 * @param {string} options.context - Context name for logging (default: channel name)
 * @param {boolean} options.wrapResult - Whether to wrap result in {success, data} (default: true)
 * @returns {void}
 */
function createHandler(channel, handler, options = {}) {
    const { context = channel, wrapResult = true } = options;

    ipcMain.handle(channel, async (event, ...args) => {
        try {
            const result = await handler(event, ...args);

            if (wrapResult) {
                return {
                    success: true,
                    data: result
                };
            }
            return result;
        } catch (error) {
            logger.error(`[${context}] Error handling ${channel}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    });
}

/**
 * Create multiple IPC handlers at once
 *
 * @param {Object} handlers - Object mapping channel names to handler functions
 * @param {string} context - Context name for all handlers
 * @returns {void}
 */
function createHandlers(handlers, context) {
    Object.entries(handlers).forEach(([channel, handler]) => {
        createHandler(channel, handler, { context });
    });
}

/**
 * Create a handler that doesn't wrap the result (passes through as-is)
 *
 * @param {string} channel - IPC channel name
 * @param {Function} handler - Async handler function
 * @param {string} context - Context name for logging
 * @returns {void}
 */
function createPassthroughHandler(channel, handler, context = channel) {
    createHandler(channel, handler, { context, wrapResult: false });
}

/**
 * Create a handler for simple getter operations
 *
 * @param {string} channel - IPC channel name
 * @param {Function} getter - Getter function (no args beyond event)
 * @param {string} context - Context name for logging
 * @returns {void}
 */
function createGetterHandler(channel, getter, context = channel) {
    createHandler(channel, () => getter(), { context });
}

/**
 * Create a handler that requires authentication
 *
 * @param {string} channel - IPC channel name
 * @param {Function} handler - Handler function that receives (userId, ...args)
 * @param {Function} getUserId - Function to get current user ID
 * @param {string} context - Context name for logging
 * @returns {void}
 */
function createAuthenticatedHandler(channel, handler, getUserId, context = channel) {
    createHandler(channel, async (event, ...args) => {
        const userId = getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return await handler(userId, ...args);
    }, { context });
}

module.exports = {
    createHandler,
    createHandlers,
    createPassthroughHandler,
    createGetterHandler,
    createAuthenticatedHandler
};
