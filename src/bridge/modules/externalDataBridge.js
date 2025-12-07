/**
 * External Data Bridge - IPC handlers for external data sources
 *
 * Handles:
 * - External source management (PostgreSQL, MySQL, REST API, MongoDB, Notion, Airtable)
 * - Connection testing
 * - Data import
 * - Sync scheduling
 */

const { ipcMain } = require('electron');
const externalDataService = require('../../features/common/services/externalDataService');
const syncSchedulerService = require('../../features/common/services/syncSchedulerService');

console.log('[ExternalDataBridge] Module loaded');

function initialize() {
    console.log('[ExternalDataBridge] Initializing IPC handlers...');

    // ========================================================================
    // CONNECTION TESTING
    // ========================================================================

    /**
     * Test PostgreSQL connection
     */
    ipcMain.handle('external:test-postgres', async (event, config) => {
        try {
            const result = await externalDataService.testPostgresConnection(config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] PostgreSQL test error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Test MySQL connection
     */
    ipcMain.handle('external:test-mysql', async (event, config) => {
        try {
            const result = await externalDataService.testMySQLConnection(config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] MySQL test error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Test REST API connection
     */
    ipcMain.handle('external:test-rest-api', async (event, config) => {
        try {
            const result = await externalDataService.testRestAPIConnection(config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] REST API test error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Test MongoDB connection
     */
    ipcMain.handle('external:test-mongodb', async (event, config) => {
        try {
            const result = await externalDataService.testMongoDBConnection(config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] MongoDB test error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Test Notion connection
     */
    ipcMain.handle('external:test-notion', async (event, config) => {
        try {
            const result = await externalDataService.testNotionConnection(config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Notion test error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Test Airtable connection
     */
    ipcMain.handle('external:test-airtable', async (event, config) => {
        try {
            const result = await externalDataService.testAirtableConnection(config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Airtable test error:', error);
            return { success: false, error: error.message };
        }
    });

    // ========================================================================
    // SOURCE MANAGEMENT
    // ========================================================================

    /**
     * Create or update external source
     */
    ipcMain.handle('external:create-source', async (event, { sourceData, uid }) => {
        try {
            const sourceId = await externalDataService.createOrUpdateExternalSource(sourceData, uid);
            return { success: true, sourceId };
        } catch (error) {
            console.error('[ExternalDataBridge] Create source error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get all external sources for a user
     */
    ipcMain.handle('external:get-sources', async (event, { uid }) => {
        try {
            const sources = await externalDataService.getExternalSources(uid);
            return { success: true, sources };
        } catch (error) {
            console.error('[ExternalDataBridge] Get sources error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Delete external source
     */
    ipcMain.handle('external:delete-source', async (event, { sourceId }) => {
        try {
            await externalDataService.deleteExternalSource(sourceId);
            return { success: true };
        } catch (error) {
            console.error('[ExternalDataBridge] Delete source error:', error);
            return { success: false, error: error.message };
        }
    });

    // ========================================================================
    // DATA IMPORT
    // ========================================================================

    /**
     * Import data from database (PostgreSQL/MySQL)
     */
    ipcMain.handle('external:import-database', async (event, { sourceId, query, mappingConfig, uid }) => {
        try {
            const result = await externalDataService.importFromDatabase(sourceId, query, mappingConfig, uid);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Import database error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Import data from REST API
     */
    ipcMain.handle('external:import-rest-api', async (event, { sourceId, endpoint, options, mappingConfig, uid }) => {
        try {
            const result = await externalDataService.importFromRestAPI(sourceId, endpoint, options, mappingConfig, uid);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Import REST API error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Import data from MongoDB
     */
    ipcMain.handle('external:import-mongodb', async (event, { sourceId, collection, filter, mappingConfig, uid }) => {
        try {
            const result = await externalDataService.importFromMongoDB(sourceId, collection, filter, mappingConfig, uid);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Import MongoDB error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Import data from Notion
     */
    ipcMain.handle('external:import-notion', async (event, { sourceId, databaseId, filter, uid }) => {
        try {
            const result = await externalDataService.importFromNotion(sourceId, databaseId, filter, uid);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Import Notion error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Import data from Airtable
     */
    ipcMain.handle('external:import-airtable', async (event, { sourceId, baseId, tableId, uid }) => {
        try {
            const result = await externalDataService.importFromAirtable(sourceId, baseId, tableId, uid);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Import Airtable error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get import history
     */
    ipcMain.handle('external:get-import-history', async (event, { sourceId, limit }) => {
        try {
            const history = await externalDataService.getImportHistory(sourceId, limit);
            return { success: true, history };
        } catch (error) {
            console.error('[ExternalDataBridge] Get import history error:', error);
            return { success: false, error: error.message };
        }
    });

    // ========================================================================
    // SYNC SCHEDULER
    // ========================================================================

    /**
     * Get sync status for all sources
     */
    ipcMain.handle('external:get-sync-status', async (event, { uid }) => {
        try {
            const status = await syncSchedulerService.getSyncStatus(uid);
            return { success: true, status };
        } catch (error) {
            console.error('[ExternalDataBridge] Get sync status error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Trigger manual sync for a source
     */
    ipcMain.handle('external:trigger-sync', async (event, { sourceId }) => {
        try {
            const result = await syncSchedulerService.triggerManualSync(sourceId);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Trigger sync error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Update sync configuration
     */
    ipcMain.handle('external:update-sync-config', async (event, { sourceId, config }) => {
        try {
            const result = await syncSchedulerService.updateSyncConfig(sourceId, config);
            return result;
        } catch (error) {
            console.error('[ExternalDataBridge] Update sync config error:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Check if scheduler is running
     */
    ipcMain.handle('external:is-scheduler-running', async () => {
        return { running: syncSchedulerService.isSchedulerRunning() };
    });

    console.log('[ExternalDataBridge] IPC handlers initialized');
}

function cleanup() {
    console.log('[ExternalDataBridge] Cleaning up...');
    // Remove all handlers
    const handlers = [
        'external:test-postgres',
        'external:test-mysql',
        'external:test-rest-api',
        'external:test-mongodb',
        'external:test-notion',
        'external:test-airtable',
        'external:create-source',
        'external:get-sources',
        'external:delete-source',
        'external:import-database',
        'external:import-rest-api',
        'external:import-mongodb',
        'external:import-notion',
        'external:import-airtable',
        'external:get-import-history',
        'external:get-sync-status',
        'external:trigger-sync',
        'external:update-sync-config',
        'external:is-scheduler-running'
    ];

    handlers.forEach(handler => {
        try {
            ipcMain.removeHandler(handler);
        } catch (e) {
            // Ignore if handler doesn't exist
        }
    });

    console.log('[ExternalDataBridge] Cleanup complete');
}

module.exports = {
    initialize,
    cleanup
};
