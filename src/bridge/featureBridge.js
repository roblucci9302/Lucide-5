/**
 * Feature Bridge - Main orchestrator for all IPC bridges
 * Delegates to specialized bridges for better modularity
 */

// Import all specialized bridges
const settingsBridge = require('./modules/settingsBridge');
const aiModelsBridge = require('./modules/aiModelsBridge');
const conversationBridge = require('./modules/conversationBridge');
const knowledgeBridge = require('./modules/knowledgeBridge');
const authPermissionsBridge = require('./modules/authPermissionsBridge');
const eventsBridge = require('./modules/eventsBridge');
const profileBridge = require('./modules/profileBridge');
const promptBridge = require('./modules/promptBridge'); // Phase WOW 1 - Jour 5
const postMeetingBridge = require('./modules/postMeetingBridge'); // Phase 1 - Meeting Assistant
const participantBridge = require('./modules/participantBridge'); // Phase 2 - Participant Attribution
const emailBridge = require('./modules/emailBridge'); // Phase 2 - Email Generation
const taskBridge = require('./modules/taskBridge'); // Phase 2.3 - Task Management
const liveInsightsBridge = require('./modules/liveInsightsBridge'); // Phase 3 - Live Insights
const notificationBridge = require('./modules/notificationBridge'); // Phase 3.3 - Notifications
const analyticsBridge = require('./modules/analyticsBridge'); // Phase 4 - Analytics
const externalDataBridge = require('./modules/externalDataBridge'); // Phase 2 - External Data Sources
const memoryBridge = require('./modules/memoryBridge'); // Phase 2 - Memory Dashboard
const licenseBridge = require('./modules/licenseBridge'); // Phase 3 - License & Feature Gates
const syncBridge = require('./modules/syncBridge'); // Phase 3 - Cloud Sync
const enterpriseBridge = require('./modules/enterpriseBridge'); // Phase 3 - Enterprise Gateway

module.exports = {
    /**
     * Initialize all IPC bridges
     * Delegates to specialized bridges for each domain
     * Each bridge is wrapped in try-catch for resilience
     */
    initialize() {
        console.log('[FeatureBridge] Initializing all bridges...');

        const bridges = [
            { name: 'settingsBridge', init: () => settingsBridge.initialize() },
            { name: 'aiModelsBridge', init: () => aiModelsBridge.initialize() },
            { name: 'conversationBridge', init: () => conversationBridge.initialize() },
            { name: 'knowledgeBridge', init: () => knowledgeBridge.initialize() },
            { name: 'authPermissionsBridge', init: () => authPermissionsBridge.initialize() },
            { name: 'eventsBridge', init: () => eventsBridge.initialize() },
            { name: 'profileBridge', init: () => profileBridge.initialize() },
            { name: 'promptBridge', init: () => promptBridge.initialize() },
            { name: 'postMeetingBridge', init: () => postMeetingBridge.initialize() },
            { name: 'participantBridge', init: () => participantBridge.initialize() },
            { name: 'emailBridge', init: () => emailBridge.initialize() },
            { name: 'taskBridge', init: () => taskBridge.initialize() },
            { name: 'liveInsightsBridge', init: () => liveInsightsBridge.initialize() },
            { name: 'notificationBridge', init: () => notificationBridge.initialize() },
            { name: 'analyticsBridge', init: () => analyticsBridge.initialize() },
            { name: 'externalDataBridge', init: () => externalDataBridge.initialize() },
            { name: 'memoryBridge', init: () => memoryBridge.initialize() },
            { name: 'licenseBridge', init: () => licenseBridge.initialize() },
            { name: 'syncBridge', init: () => syncBridge.initialize() },
            { name: 'enterpriseBridge', init: () => enterpriseBridge.initialize() },
        ];

        const failedBridges = [];

        for (const bridge of bridges) {
            try {
                bridge.init();
                console.log(`[FeatureBridge] ✓ ${bridge.name} initialized`);
            } catch (err) {
                console.error(`[FeatureBridge] ✗ ${bridge.name} FAILED:`, err.message);
                failedBridges.push({ name: bridge.name, error: err.message });
            }
        }

        if (failedBridges.length > 0) {
            console.error('[FeatureBridge] Some bridges failed to initialize:', failedBridges);
            // Don't throw - let app continue with partial functionality
        }

        console.log(`[FeatureBridge] Initialization complete: ${bridges.length - failedBridges.length}/${bridges.length} bridges OK`);
    },

    /**
     * Cleanup all event listeners to prevent memory leaks
     * Should be called before app shutdown
     */
    cleanup() {
        console.log('[FeatureBridge] Starting cleanup of all bridges...');

        // Cleanup event listeners from eventsBridge
        eventsBridge.cleanup();

        // Cleanup external data bridge
        externalDataBridge.cleanup();

        // Cleanup sync bridge (stop automatic sync)
        syncBridge.cleanup();

        // Cleanup enterprise bridge (disconnect from gateway)
        enterpriseBridge.cleanup();

        console.log('[FeatureBridge] All bridges cleaned up successfully');
    },

    /**
     * Envoyer l'état au Renderer
     * Délègue à conversationBridge
     */
    sendAskProgress(win, progress) {
        conversationBridge.sendAskProgress(win, progress);
    }
};
