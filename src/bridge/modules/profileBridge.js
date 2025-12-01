/**
 * Profile Bridge - IPC handlers for user profiles and onboarding
 * Part of Phase WOW 1: Profiles Intelligents & Agents Spécialisés
 */
const { ipcMain } = require('electron');
const userProfileService = require('../../features/common/services/userProfileService');
const agentProfileService = require('../../features/common/services/agentProfileService');
const profileThemeService = require('../../features/common/services/profileThemeService');

module.exports = {
    initialize() {
        // User Profile Management
        ipcMain.handle('profile:get-current', async () => {
            try {
                const profile = userProfileService.getCurrentProfile();
                return { success: true, profile };
            } catch (error) {
                console.error('[ProfileBridge] Error getting current profile:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:needs-onboarding', async () => {
            try {
                const needs = userProfileService.needsOnboarding();
                return { success: true, needsOnboarding: needs };
            } catch (error) {
                console.error('[ProfileBridge] Error checking onboarding:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:start-onboarding', async () => {
            try {
                const config = userProfileService.startOnboarding();
                return { success: true, config };
            } catch (error) {
                console.error('[ProfileBridge] Error starting onboarding:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:complete-onboarding', async (event, data) => {
            try {
                const profile = await userProfileService.completeOnboarding(data);
                return { success: true, profile };
            } catch (error) {
                console.error('[ProfileBridge] Error completing onboarding:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:switch', async (event, { profileId, reason }) => {
            try {
                const success = await userProfileService.switchProfile(profileId, reason || 'manual');
                return { success };
            } catch (error) {
                console.error('[ProfileBridge] Error switching profile:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:update-preferences', async (event, preferences) => {
            try {
                const success = await userProfileService.updatePreferences(preferences);
                return { success };
            } catch (error) {
                console.error('[ProfileBridge] Error updating preferences:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-switch-history', async (event, limit) => {
            try {
                const history = await userProfileService.getSwitchHistory(limit);
                return { success: true, history };
            } catch (error) {
                console.error('[ProfileBridge] Error getting switch history:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-usage-stats', async () => {
            try {
                const stats = await userProfileService.getUsageStats();
                return { success: true, stats };
            } catch (error) {
                console.error('[ProfileBridge] Error getting usage stats:', error);
                return { success: false, error: error.message };
            }
        });

        // Agent Profile Management
        ipcMain.handle('profile:get-agent-profiles', async () => {
            try {
                const profiles = agentProfileService.getAvailableProfiles();
                return { success: true, profiles };
            } catch (error) {
                console.error('[ProfileBridge] Error getting agent profiles:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-current-agent', async () => {
            try {
                const profileId = agentProfileService.getCurrentProfile();
                const profile = agentProfileService.getProfileById(profileId);
                return { success: true, profile, profileId };
            } catch (error) {
                console.error('[ProfileBridge] Error getting current agent:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-onboarding-questions', async (event, profileId) => {
            try {
                const questions = userProfileService.getOnboardingQuestions(profileId);
                return { success: true, questions };
            } catch (error) {
                console.error('[ProfileBridge] Error getting onboarding questions:', error);
                return { success: false, error: error.message };
            }
        });

        // Theme Management (Phase WOW 1 - Jour 3)
        ipcMain.handle('profile:get-theme', async (event, profileId) => {
            try {
                const themeService = profileThemeService.getInstance();
                const theme = themeService.getTheme(profileId);
                return { success: true, theme };
            } catch (error) {
                console.error('[ProfileBridge] Error getting theme:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-current-theme', async () => {
            try {
                const themeService = profileThemeService.getInstance();
                const currentTheme = themeService.getCurrentTheme();
                return { success: true, ...currentTheme };
            } catch (error) {
                console.error('[ProfileBridge] Error getting current theme:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-all-themes', async () => {
            try {
                const themeService = profileThemeService.getInstance();
                const themes = themeService.getAllThemes();
                return { success: true, themes };
            } catch (error) {
                console.error('[ProfileBridge] Error getting all themes:', error);
                return { success: false, error: error.message };
            }
        });

        // Listen to theme service changes and forward to renderer
        const themeService = profileThemeService.getInstance();
        themeService.on('theme-changed', (data) => {
            // Send to all windows
            const { BrowserWindow } = require('electron');
            BrowserWindow.getAllWindows().forEach(window => {
                window.webContents.send('profile:theme-changed', data);
            });
        });

        // Listen to profile switches to auto-update theme
        userProfileService.on('profile-switched', async (data) => {
            if (data.newProfile) {
                themeService.applyTheme(data.newProfile);
            }
        });

        // Agent Router & Suggestions (Phase WOW 1 - Jour 4)
        const agentRouterService = require('../../features/common/services/agentRouterService');

        ipcMain.handle('profile:analyze-suggestion', async (event, { question, currentProfile }) => {
            try {
                const suggestion = agentRouterService.analyzeSuggestion(question, currentProfile);
                return { success: true, suggestion };
            } catch (error) {
                console.error('[ProfileBridge] Error analyzing suggestion:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:accept-suggestion', async (event, suggestion) => {
            try {
                const success = agentRouterService.acceptSuggestion(suggestion);
                return { success };
            } catch (error) {
                console.error('[ProfileBridge] Error accepting suggestion:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:reject-suggestion', async (event, suggestion) => {
            try {
                const success = agentRouterService.rejectSuggestion(suggestion);
                return { success };
            } catch (error) {
                console.error('[ProfileBridge] Error rejecting suggestion:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-suggestion-history', async (event, limit) => {
            try {
                const history = agentRouterService.getSuggestionHistory(limit);
                return { success: true, history };
            } catch (error) {
                console.error('[ProfileBridge] Error getting suggestion history:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:get-suggestion-stats', async () => {
            try {
                const stats = agentRouterService.getSuggestionStats();
                return { success: true, stats };
            } catch (error) {
                console.error('[ProfileBridge] Error getting suggestion stats:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('profile:set-suggestions-enabled', async (event, enabled) => {
            try {
                agentRouterService.setSuggestionsEnabled(enabled);
                return { success: true };
            } catch (error) {
                console.error('[ProfileBridge] Error setting suggestions enabled:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[ProfileBridge] Initialized with theme and suggestion support');
    }
};
