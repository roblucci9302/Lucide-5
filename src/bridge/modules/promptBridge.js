/**
 * Prompt Bridge - Phase WOW 1 Jour 5
 *
 * IPC handlers for prompt engineering and user context
 */

const { ipcMain } = require('electron');
const promptEngineeringService = require('../../features/common/services/promptEngineeringService');
const userContextService = require('../../features/common/services/userContextService');

module.exports = {
    initialize() {
        console.log('[PromptBridge] Initializing prompt engineering IPC handlers...');
        this.setupHandlers();
    },

    setupHandlers() {
        // Prompt Engineering

        ipcMain.handle('prompt:generate', async (event, {
            question,
            profileId,
            uid,
            sessionId,
            customContext
        }) => {
            try {
                const prompt = await promptEngineeringService.generatePrompt({
                    question,
                    profileId,
                    uid,
                    sessionId,
                    customContext
                });

                return { success: true, prompt };
            } catch (error) {
                console.error('[PromptBridge] Error generating prompt:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('prompt:get-profile-info', async (event, profileId) => {
            try {
                const info = promptEngineeringService.getProfileInfo(profileId);
                return { success: true, info };
            } catch (error) {
                console.error('[PromptBridge] Error getting profile info:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('prompt:get-available-profiles', async () => {
            try {
                const profiles = promptEngineeringService.getAvailableProfiles();
                return { success: true, profiles };
            } catch (error) {
                console.error('[PromptBridge] Error getting available profiles:', error);
                return { success: false, error: error.message };
            }
        });

        // User Context

        ipcMain.handle('context:get', async (event, uid) => {
            try {
                const context = userContextService.getContext(uid);
                return { success: true, context };
            } catch (error) {
                console.error('[PromptBridge] Error getting context:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('context:save', async (event, { uid, context }) => {
            try {
                const success = userContextService.saveContext(uid, context);
                return { success };
            } catch (error) {
                console.error('[PromptBridge] Error saving context:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('context:update', async (event, { uid, updates }) => {
            try {
                const success = userContextService.updateContext(uid, updates);
                return { success };
            } catch (error) {
                console.error('[PromptBridge] Error updating context:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('context:complete-onboarding', async (event, uid) => {
            try {
                const success = userContextService.completeOnboarding(uid);
                return { success };
            } catch (error) {
                console.error('[PromptBridge] Error completing onboarding:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('context:skip-onboarding', async (event, uid) => {
            try {
                const success = userContextService.skipOnboarding(uid);
                return { success };
            } catch (error) {
                console.error('[PromptBridge] Error skipping onboarding:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('context:has-completed-onboarding', async (event, uid) => {
            try {
                const completed = userContextService.hasCompletedOnboarding(uid);
                return { success: true, completed };
            } catch (error) {
                console.error('[PromptBridge] Error checking onboarding:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('context:get-summary', async (event, uid) => {
            try {
                const summary = userContextService.getContextSummary(uid);
                return { success: true, summary };
            } catch (error) {
                console.error('[PromptBridge] Error getting context summary:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[PromptBridge] Registered IPC handlers for prompt engineering and user context');
    }
};
