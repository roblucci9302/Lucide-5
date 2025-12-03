/**
 * Export Dialog Factory
 *
 * Provides standardized export dialog handling to eliminate code duplication
 * across export handlers. Reduces 4 duplicate dialog patterns.
 */

const { dialog } = require('electron');
const path = require('path');
const os = require('os');
const { createLogger } = require('../../features/common/utils/logger');

const logger = createLogger('ExportDialog');

/**
 * Export format configurations
 */
const EXPORT_FORMATS = {
    json: {
        title: 'Export Conversation to JSON',
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        extension: 'json'
    },
    markdown: {
        title: 'Export Conversation to Markdown',
        filters: [
            { name: 'Markdown Files', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        extension: 'md'
    },
    pdf: {
        title: 'Export Conversation to PDF',
        filters: [
            { name: 'PDF Files', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        extension: 'pdf'
    },
    docx: {
        title: 'Export Conversation to DOCX',
        filters: [
            { name: 'Word Documents', extensions: ['docx'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        extension: 'docx'
    }
};

/**
 * Show export dialog and execute export function
 *
 * @param {string} sessionId - Session ID to export
 * @param {string} format - Export format (json, markdown, pdf, docx)
 * @param {Object} services - Service dependencies
 * @param {Object} services.conversationHistoryService - Service to get session
 * @param {Object} services.exportService - Service to perform export
 * @returns {Promise<Object>} - Result object with success/error/cancelled
 */
async function showExportDialog(sessionId, format, services) {
    const { conversationHistoryService, exportService } = services;
    const formatConfig = EXPORT_FORMATS[format];

    if (!formatConfig) {
        return { success: false, error: `Unknown export format: ${format}` };
    }

    try {
        // Get session
        const session = await conversationHistoryService.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Get suggested filename
        const suggestedFilename = exportService.getSuggestedFilename(session, format);

        // Show save dialog
        const result = await dialog.showSaveDialog({
            title: formatConfig.title,
            defaultPath: path.join(os.homedir(), 'Downloads', suggestedFilename),
            filters: formatConfig.filters
        });

        // Handle cancellation
        if (result.canceled || !result.filePath) {
            return { success: false, cancelled: true };
        }

        // Execute export based on format
        const exportMethod = `exportTo${format.charAt(0).toUpperCase() + format.slice(1).replace('markdown', 'Markdown')}`;
        const exportFn = exportService[exportMethod] || exportService[`exportTo${format.toUpperCase()}`];

        if (!exportFn) {
            throw new Error(`Export method not found for format: ${format}`);
        }

        return await exportFn.call(exportService, sessionId, result.filePath);
    } catch (error) {
        logger.error(`Error exporting to ${format}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Create export handlers for all formats
 *
 * @param {Object} ipcMain - Electron ipcMain module
 * @param {Object} services - Service dependencies
 * @param {string} prefix - Channel prefix (default: 'export')
 * @returns {void}
 */
function createExportHandlers(ipcMain, services, prefix = 'export') {
    Object.keys(EXPORT_FORMATS).forEach(format => {
        const channel = `${prefix}:conversation-${format}`;

        ipcMain.handle(channel, async (event, sessionId) => {
            return await showExportDialog(sessionId, format, services);
        });
    });
}

module.exports = {
    EXPORT_FORMATS,
    showExportDialog,
    createExportHandlers
};
