/**
 * Notification Bridge - IPC handlers for notifications (Phase 3.3)
 */
const { ipcMain } = require('electron');
const notificationService = require('../../features/listen/liveInsights/notificationService');

module.exports = {
    initialize() {
        console.log('[NotificationBridge] Initializing IPC handlers...');

        /**
         * Get all notifications
         */
        ipcMain.handle('notifications:get-all', async (event) => {
            try {
                const notifications = notificationService.getAllNotifications();

                return {
                    success: true,
                    notifications
                };
            } catch (error) {
                console.error('[NotificationBridge] Error getting notifications:', error);
                return {
                    success: false,
                    error: error.message,
                    notifications: []
                };
            }
        });

        /**
         * Get unread notifications
         */
        ipcMain.handle('notifications:get-unread', async (event) => {
            try {
                const notifications = notificationService.getUnreadNotifications();

                return {
                    success: true,
                    notifications
                };
            } catch (error) {
                console.error('[NotificationBridge] Error getting unread notifications:', error);
                return {
                    success: false,
                    error: error.message,
                    notifications: []
                };
            }
        });

        /**
         * Get unread count
         */
        ipcMain.handle('notifications:get-unread-count', async (event) => {
            try {
                const count = notificationService.getUnreadCount();

                return {
                    success: true,
                    count
                };
            } catch (error) {
                console.error('[NotificationBridge] Error getting unread count:', error);
                return {
                    success: false,
                    error: error.message,
                    count: 0
                };
            }
        });

        /**
         * Mark notification as read
         */
        ipcMain.handle('notifications:mark-as-read', async (event, notificationId) => {
            try {
                notificationService.markAsRead(notificationId);

                return {
                    success: true
                };
            } catch (error) {
                console.error('[NotificationBridge] Error marking as read:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Mark all notifications as read
         */
        ipcMain.handle('notifications:mark-all-as-read', async (event) => {
            try {
                notificationService.markAllAsRead();

                return {
                    success: true
                };
            } catch (error) {
                console.error('[NotificationBridge] Error marking all as read:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Clear a notification
         */
        ipcMain.handle('notifications:clear', async (event, notificationId) => {
            try {
                notificationService.clearNotification(notificationId);

                return {
                    success: true
                };
            } catch (error) {
                console.error('[NotificationBridge] Error clearing notification:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Clear all notifications
         */
        ipcMain.handle('notifications:clear-all', async (event) => {
            try {
                notificationService.clearAll();

                return {
                    success: true
                };
            } catch (error) {
                console.error('[NotificationBridge] Error clearing all notifications:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get notification preferences
         */
        ipcMain.handle('notifications:get-preferences', async (event) => {
            try {
                const preferences = notificationService.getPreferences();

                return {
                    success: true,
                    preferences
                };
            } catch (error) {
                console.error('[NotificationBridge] Error getting preferences:', error);
                return {
                    success: false,
                    error: error.message,
                    preferences: null
                };
            }
        });

        /**
         * Update notification preferences
         */
        ipcMain.handle('notifications:update-preferences', async (event, preferences) => {
            try {
                notificationService.updatePreferences(preferences);

                return {
                    success: true
                };
            } catch (error) {
                console.error('[NotificationBridge] Error updating preferences:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Enable/disable notifications
         */
        ipcMain.handle('notifications:set-enabled', async (event, enabled) => {
            try {
                notificationService.setEnabled(enabled);

                return {
                    success: true
                };
            } catch (error) {
                console.error('[NotificationBridge] Error setting enabled:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get notifications by type
         */
        ipcMain.handle('notifications:get-by-type', async (event, type) => {
            try {
                const notifications = notificationService.getNotificationsByType(type);

                return {
                    success: true,
                    notifications
                };
            } catch (error) {
                console.error('[NotificationBridge] Error getting notifications by type:', error);
                return {
                    success: false,
                    error: error.message,
                    notifications: []
                };
            }
        });

        /**
         * Get notifications by priority
         */
        ipcMain.handle('notifications:get-by-priority', async (event, priority) => {
            try {
                const notifications = notificationService.getNotificationsByPriority(priority);

                return {
                    success: true,
                    notifications
                };
            } catch (error) {
                console.error('[NotificationBridge] Error getting notifications by priority:', error);
                return {
                    success: false,
                    error: error.message,
                    notifications: []
                };
            }
        });

        console.log('[NotificationBridge] ✅ IPC handlers initialized');
    }
};
