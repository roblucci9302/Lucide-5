/**
 * Enterprise Bridge - IPC handlers for enterprise data gateway
 *
 * Provides secure communication between renderer and main process
 * for connecting to enterprise databases via the gateway API.
 */

const { ipcMain } = require('electron');
const enterpriseDataService = require('../../features/common/services/enterpriseDataService');
const featureGates = require('../../features/common/services/featureGates');

module.exports = {
    initialize() {
        console.log('[EnterpriseBridge] Initializing IPC handlers...');

        // ═══════════════════════════════════════════════════════════════════════
        // CONNECTION MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Connect to enterprise gateway
         */
        ipcMain.handle('enterprise:connect', async (event, { gatewayToken }) => {
            try {
                // Check if user has enterprise gateway feature
                const canUse = await featureGates.canUseEnterpriseGateway();
                if (!canUse) {
                    return {
                        success: false,
                        error: 'Enterprise Gateway requires Enterprise tier',
                        requiresUpgrade: true
                    };
                }

                const result = await enterpriseDataService.connect(gatewayToken);
                return { success: true, ...result };
            } catch (error) {
                console.error('[EnterpriseBridge] Error connecting to gateway:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Disconnect from enterprise gateway
         */
        ipcMain.handle('enterprise:disconnect', async () => {
            try {
                enterpriseDataService.disconnect();
                return { success: true };
            } catch (error) {
                console.error('[EnterpriseBridge] Error disconnecting:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Check connection status
         */
        ipcMain.handle('enterprise:get-status', async () => {
            try {
                return {
                    success: true,
                    status: {
                        isConnected: enterpriseDataService.isConnected,
                        databases: enterpriseDataService.availableDatabases,
                        stats: enterpriseDataService.stats
                    }
                };
            } catch (error) {
                console.error('[EnterpriseBridge] Error getting status:', error);
                return { success: false, error: error.message };
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // DATABASE EXPLORATION
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Get available databases
         */
        ipcMain.handle('enterprise:get-databases', async () => {
            try {
                if (!enterpriseDataService.isConnected) {
                    return { success: false, error: 'Not connected to gateway' };
                }

                return {
                    success: true,
                    databases: enterpriseDataService.availableDatabases
                };
            } catch (error) {
                console.error('[EnterpriseBridge] Error getting databases:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Get database schema
         */
        ipcMain.handle('enterprise:get-schema', async (event, { database }) => {
            try {
                if (!enterpriseDataService.isConnected) {
                    return { success: false, error: 'Not connected to gateway' };
                }

                const schema = await enterpriseDataService.getSchema(database);
                return { success: true, schema };
            } catch (error) {
                console.error('[EnterpriseBridge] Error getting schema:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Get table details
         */
        ipcMain.handle('enterprise:get-table-details', async (event, { database, table }) => {
            try {
                if (!enterpriseDataService.isConnected) {
                    return { success: false, error: 'Not connected to gateway' };
                }

                const details = await enterpriseDataService.getTableDetails(database, table);
                return { success: true, details };
            } catch (error) {
                console.error('[EnterpriseBridge] Error getting table details:', error);
                return { success: false, error: error.message };
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // QUERIES
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Ask a question in natural language
         * Gateway converts to SQL and executes
         */
        ipcMain.handle('enterprise:ask', async (event, { question, database }) => {
            try {
                // Check feature availability
                const canUse = await featureGates.canUseEnterpriseGateway();
                if (!canUse) {
                    return {
                        success: false,
                        error: 'Enterprise Gateway requires Enterprise tier',
                        requiresUpgrade: true
                    };
                }

                if (!enterpriseDataService.isConnected) {
                    return { success: false, error: 'Not connected to gateway' };
                }

                const result = await enterpriseDataService.askQuestion(question, database);
                return { success: true, ...result };
            } catch (error) {
                console.error('[EnterpriseBridge] Error executing query:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Execute raw SQL query (if allowed by gateway)
         */
        ipcMain.handle('enterprise:execute-sql', async (event, { sql, database }) => {
            try {
                // Check feature availability
                const canUse = await featureGates.canUseEnterpriseGateway();
                if (!canUse) {
                    return {
                        success: false,
                        error: 'Enterprise Gateway requires Enterprise tier',
                        requiresUpgrade: true
                    };
                }

                if (!enterpriseDataService.isConnected) {
                    return { success: false, error: 'Not connected to gateway' };
                }

                const result = await enterpriseDataService.executeSQLQuery(sql, database);
                return { success: true, ...result };
            } catch (error) {
                console.error('[EnterpriseBridge] Error executing SQL:', error);
                return { success: false, error: error.message };
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // QUERY HISTORY
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Get query history
         */
        ipcMain.handle('enterprise:get-history', async (event, { limit = 50 }) => {
            try {
                const history = enterpriseDataService.getQueryHistory ?
                    await enterpriseDataService.getQueryHistory(limit) : [];
                return { success: true, history };
            } catch (error) {
                console.error('[EnterpriseBridge] Error getting history:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Clear query history
         */
        ipcMain.handle('enterprise:clear-history', async () => {
            try {
                if (enterpriseDataService.clearQueryHistory) {
                    await enterpriseDataService.clearQueryHistory();
                }
                return { success: true };
            } catch (error) {
                console.error('[EnterpriseBridge] Error clearing history:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Get query statistics
         */
        ipcMain.handle('enterprise:get-stats', async () => {
            try {
                return {
                    success: true,
                    stats: enterpriseDataService.stats
                };
            } catch (error) {
                console.error('[EnterpriseBridge] Error getting stats:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[EnterpriseBridge] Initialized');
    },

    /**
     * Cleanup on app shutdown
     */
    cleanup() {
        console.log('[EnterpriseBridge] Cleaning up...');
        enterpriseDataService.disconnect();
    }
};
