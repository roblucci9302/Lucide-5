/**
 * Analytics Bridge - IPC handlers for analytics (Phase 4)
 */
const { ipcMain } = require('electron');
const analyticsService = require('../../features/analytics/analyticsService');

module.exports = {
    initialize() {
        console.log('[AnalyticsBridge] Initializing IPC handlers...');

        /**
         * Get overview statistics
         */
        ipcMain.handle('analytics:get-overview', async (event, options) => {
            try {
                const stats = await analyticsService.getOverviewStats(options);

                return {
                    success: true,
                    stats
                };
            } catch (error) {
                console.error('[AnalyticsBridge] Error getting overview stats:', error);
                return {
                    success: false,
                    error: error.message,
                    stats: null
                };
            }
        });

        /**
         * Get session analytics
         */
        ipcMain.handle('analytics:get-session', async (event, sessionId) => {
            try {
                const analytics = await analyticsService.getSessionAnalytics(sessionId);

                return {
                    success: true,
                    analytics
                };
            } catch (error) {
                console.error('[AnalyticsBridge] Error getting session analytics:', error);
                return {
                    success: false,
                    error: error.message,
                    analytics: null
                };
            }
        });

        /**
         * Get trending topics
         */
        ipcMain.handle('analytics:get-trending-topics', async (event, options) => {
            try {
                const topics = await analyticsService.getTrendingTopics(options);

                return {
                    success: true,
                    topics
                };
            } catch (error) {
                console.error('[AnalyticsBridge] Error getting trending topics:', error);
                return {
                    success: false,
                    error: error.message,
                    topics: []
                };
            }
        });

        /**
         * Get productivity trends
         */
        ipcMain.handle('analytics:get-productivity-trends', async (event, options) => {
            try {
                const trends = await analyticsService.getProductivityTrends(options);

                return {
                    success: true,
                    trends
                };
            } catch (error) {
                console.error('[AnalyticsBridge] Error getting productivity trends:', error);
                return {
                    success: false,
                    error: error.message,
                    trends: []
                };
            }
        });

        /**
         * Compare two sessions
         */
        ipcMain.handle('analytics:compare-sessions', async (event, sessionId1, sessionId2) => {
            try {
                const comparison = await analyticsService.compareSessions(sessionId1, sessionId2);

                return {
                    success: true,
                    comparison
                };
            } catch (error) {
                console.error('[AnalyticsBridge] Error comparing sessions:', error);
                return {
                    success: false,
                    error: error.message,
                    comparison: null
                };
            }
        });

        console.log('[AnalyticsBridge] ✅ IPC handlers initialized');
    }
};
