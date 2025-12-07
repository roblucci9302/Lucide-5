/**
 * Live Insights Bridge - IPC handlers for real-time insights
 */
const { ipcMain } = require('electron');
const liveInsightsService = require('../../features/listen/liveInsights/liveInsightsService');
const { liveInsightsRepository } = require('../../features/listen/liveInsights/repositories');
const authService = require('../../features/common/services/authService');

module.exports = {
    initialize() {
        console.log('[LiveInsightsBridge] Initializing IPC handlers...');

        /**
         * Get all insights for current session
         */
        ipcMain.handle('insights:get-all', async (event) => {
            try {
                const insights = liveInsightsService.getAllInsights();

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting insights:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get active (non-dismissed) insights
         */
        ipcMain.handle('insights:get-active', async (event) => {
            try {
                const insights = liveInsightsService.getActiveInsights();

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting active insights:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get insights by type
         */
        ipcMain.handle('insights:get-by-type', async (event, type) => {
            try {
                const insights = liveInsightsService.getInsightsByType(type);

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting insights by type:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get insights by priority
         */
        ipcMain.handle('insights:get-by-priority', async (event, priority) => {
            try {
                const insights = liveInsightsService.getInsightsByPriority(priority);

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting insights by priority:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get recent insights
         */
        ipcMain.handle('insights:get-recent', async (event, count = 5) => {
            try {
                const insights = liveInsightsService.getRecentInsights(count);

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting recent insights:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get high priority insights
         */
        ipcMain.handle('insights:get-high-priority', async (event) => {
            try {
                const insights = liveInsightsService.getHighPriorityInsights();

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting high priority insights:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get session statistics
         */
        ipcMain.handle('insights:get-statistics', async (event) => {
            try {
                const stats = liveInsightsService.getSessionStatistics();

                return {
                    success: true,
                    stats
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting statistics:', error);
                return {
                    success: false,
                    error: error.message,
                    stats: null
                };
            }
        });

        /**
         * Dismiss an insight
         */
        ipcMain.handle('insights:dismiss', async (event, insightId) => {
            try {
                const success = liveInsightsService.dismissInsight(insightId);

                return {
                    success,
                    message: success ? 'Insight dismissed' : 'Insight not found'
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error dismissing insight:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Save insight to database
         */
        ipcMain.handle('insights:save', async (event, insightData) => {
            try {
                const uid = authService.getCurrentUserId();

                const savedInsight = liveInsightsRepository.create({
                    ...insightData,
                    user_id: uid
                });

                return {
                    success: true,
                    insight: savedInsight
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error saving insight:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get saved insights from database by session
         */
        ipcMain.handle('insights:get-from-db', async (event, sessionId) => {
            try {
                const insights = liveInsightsRepository.getBySessionId(sessionId);

                return {
                    success: true,
                    insights
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting insights from DB:', error);
                return {
                    success: false,
                    error: error.message,
                    insights: []
                };
            }
        });

        /**
         * Get database statistics for a session
         */
        ipcMain.handle('insights:get-db-statistics', async (event, sessionId) => {
            try {
                const stats = liveInsightsRepository.getSessionStatistics(sessionId);

                return {
                    success: true,
                    stats
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting DB statistics:', error);
                return {
                    success: false,
                    error: error.message,
                    stats: null
                };
            }
        });

        /**
         * Generate intelligent summary (Phase 3.4)
         */
        ipcMain.handle('insights:generate-summary', async (event) => {
            try {
                const summary = await liveInsightsService.generateIntelligentSummary();

                return {
                    success: true,
                    summary
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error generating summary:', error);
                return {
                    success: false,
                    error: error.message,
                    summary: null
                };
            }
        });

        /**
         * Get context summary from AI analysis (Phase 3.4)
         */
        ipcMain.handle('insights:get-context-summary', async (event) => {
            try {
                const context = liveInsightsService.getContextSummary();

                return {
                    success: true,
                    context
                };
            } catch (error) {
                console.error('[LiveInsightsBridge] Error getting context summary:', error);
                return {
                    success: false,
                    error: error.message,
                    context: null
                };
            }
        });

        console.log('[LiveInsightsBridge] ✅ IPC handlers initialized (Phase 3 + 3.4)');
    }
};
