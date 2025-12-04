/**
 * Sync Bridge - IPC handlers for cloud synchronization
 *
 * Provides secure communication between renderer and main process
 * for managing bidirectional sync between local SQLite and Supabase cloud.
 */

const { ipcMain } = require('electron');
const syncService = require('../../features/common/services/syncService');
const featureGates = require('../../features/common/services/featureGates');
const authService = require('../../features/common/services/authService');

// Track sync status for UI updates
let mainWindow = null;

module.exports = {
    /**
     * Set main window reference for sending status updates
     */
    setMainWindow(win) {
        mainWindow = win;
    },

    initialize() {
        console.log('[SyncBridge] Initializing IPC handlers...');

        // ═══════════════════════════════════════════════════════════════════════
        // SYNC CONTROL
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Start automatic cloud sync
         */
        ipcMain.handle('sync:start', async () => {
            try {
                // Check if user has cloud sync feature
                const canSync = await featureGates.canUseCloudSync();
                if (!canSync) {
                    return {
                        success: false,
                        error: 'Cloud sync requires Professional tier or higher',
                        requiresUpgrade: true
                    };
                }

                // Get current user
                const userId = authService.getCurrentUserId();
                const authToken = authService.getAccessToken();

                if (!userId || !authToken) {
                    return {
                        success: false,
                        error: 'User not authenticated'
                    };
                }

                // Start sync
                const started = await syncService.start(userId, authToken);

                // Set up status updates to renderer
                syncService.onStatusChange((status) => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('sync:status-changed', status);
                    }
                });

                return { success: started };
            } catch (error) {
                console.error('[SyncBridge] Error starting sync:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Stop automatic cloud sync
         */
        ipcMain.handle('sync:stop', async () => {
            try {
                syncService.stop();
                return { success: true };
            } catch (error) {
                console.error('[SyncBridge] Error stopping sync:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Force immediate sync
         */
        ipcMain.handle('sync:force', async () => {
            try {
                // Check feature availability
                const canSync = await featureGates.canUseCloudSync();
                if (!canSync) {
                    return {
                        success: false,
                        error: 'Cloud sync requires Professional tier or higher',
                        requiresUpgrade: true
                    };
                }

                const result = await syncService.performSync();
                return { success: true, result };
            } catch (error) {
                console.error('[SyncBridge] Error forcing sync:', error);
                return { success: false, error: error.message };
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // SYNC STATUS
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Get current sync status
         */
        ipcMain.handle('sync:get-status', async () => {
            try {
                const status = syncService.getStatus();
                const stats = syncService.getStats();

                return {
                    success: true,
                    status: {
                        isEnabled: syncService.syncEnabled,
                        isSyncing: syncService.isSyncing,
                        isOnline: syncService.isOnline,
                        lastSyncTime: syncService.lastSyncTime,
                        ...status
                    },
                    stats
                };
            } catch (error) {
                console.error('[SyncBridge] Error getting sync status:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Get sync statistics
         */
        ipcMain.handle('sync:get-stats', async () => {
            try {
                const stats = syncService.getStats();
                return { success: true, stats };
            } catch (error) {
                console.error('[SyncBridge] Error getting sync stats:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Check if sync is available (feature + online)
         */
        ipcMain.handle('sync:is-available', async () => {
            try {
                const canSync = await featureGates.canUseCloudSync();
                const isOnline = syncService.isOnline;

                return {
                    success: true,
                    available: canSync && isOnline,
                    canSync,
                    isOnline
                };
            } catch (error) {
                console.error('[SyncBridge] Error checking sync availability:', error);
                return { success: false, error: error.message };
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // CONFLICT RESOLUTION
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Get pending conflicts
         */
        ipcMain.handle('sync:get-conflicts', async () => {
            try {
                const conflicts = syncService.getPendingConflicts ?
                    await syncService.getPendingConflicts() : [];
                return { success: true, conflicts };
            } catch (error) {
                console.error('[SyncBridge] Error getting conflicts:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Resolve a sync conflict
         */
        ipcMain.handle('sync:resolve-conflict', async (event, { conflictId, resolution }) => {
            try {
                if (syncService.resolveConflict) {
                    await syncService.resolveConflict(conflictId, resolution);
                }
                return { success: true };
            } catch (error) {
                console.error('[SyncBridge] Error resolving conflict:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[SyncBridge] Initialized');
    },

    /**
     * Cleanup on app shutdown
     */
    cleanup() {
        console.log('[SyncBridge] Cleaning up...');
        syncService.stop();
    }
};
