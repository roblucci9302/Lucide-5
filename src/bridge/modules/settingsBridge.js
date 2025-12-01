/**
 * Settings Bridge - IPC handlers for settings and shortcuts
 */
const { ipcMain } = require('electron');
const settingsService = require('../../features/settings/settingsService');
const shortcutsService = require('../../features/shortcuts/shortcutsService');
const presetRepository = require('../../features/common/repositories/preset');
const firebaseKnowledgeSync = require('../../features/knowledge/services/firebaseKnowledgeSync');
const authService = require('../../features/common/services/authService');
const knowledgeBaseService = require('../../features/knowledge/knowledgeBaseService');
// NOTE: databaseManager removed - external DB handlers are now in knowledgeBridge.js

module.exports = {
    initialize() {
        // Settings Service
        ipcMain.handle('settings:getPresets', async () => await settingsService.getPresets());
        ipcMain.handle('settings:get-auto-update', async () => await settingsService.getAutoUpdateSetting());
        ipcMain.handle('settings:set-auto-update', async (event, isEnabled) => await settingsService.setAutoUpdateSetting(isEnabled));
        ipcMain.handle('settings:get-model-settings', async () => await settingsService.getModelSettings());
        ipcMain.handle('settings:clear-api-key', async (e, { provider }) => await settingsService.clearApiKey(provider));
        ipcMain.handle('settings:set-selected-model', async (e, { type, modelId }) => await settingsService.setSelectedModel(type, modelId));

        ipcMain.handle('settings:get-ollama-status', async () => await settingsService.getOllamaStatus());
        ipcMain.handle('settings:ensure-ollama-ready', async () => await settingsService.ensureOllamaReady());
        ipcMain.handle('settings:shutdown-ollama', async () => await settingsService.shutdownOllama());

        // Shortcuts
        ipcMain.handle('settings:getCurrentShortcuts', async () => await shortcutsService.loadKeybinds());
        ipcMain.handle('shortcut:getDefaultShortcuts', async () => await shortcutsService.handleRestoreDefaults());
        ipcMain.handle('shortcut:closeShortcutSettingsWindow', async () => await shortcutsService.closeShortcutSettingsWindow());
        ipcMain.handle('shortcut:openShortcutSettingsWindow', async () => await shortcutsService.openShortcutSettingsWindow());
        ipcMain.handle('shortcut:saveShortcuts', async (event, newKeybinds) => await shortcutsService.handleSaveShortcuts(newKeybinds));
        ipcMain.handle('shortcut:toggleAllWindowsVisibility', async () => await shortcutsService.toggleAllWindowsVisibility());

        // General
        ipcMain.handle('get-preset-templates', () => presetRepository.getPresetTemplates());
        ipcMain.handle('get-web-url', () => process.env.LUCIDE_WEB_URL || 'http://localhost:3000');

        // Knowledge Base
        ipcMain.handle('settings:get-knowledge-base-status', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    return { status: 'inactive', name: '', documentCount: 0 };
                }

                await firebaseKnowledgeSync.initialize();
                return await firebaseKnowledgeSync.getStatus(userId);
            } catch (error) {
                console.error('[SettingsBridge] Error getting knowledge base status:', error);
                return { status: 'inactive', name: '', documentCount: 0 };
            }
        });

        ipcMain.handle('settings:create-personal-knowledge-base', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                await firebaseKnowledgeSync.initialize();
                const result = await firebaseKnowledgeSync.createPersonalKnowledgeBase(userId);

                if (result.success) {
                    firebaseKnowledgeSync.setupRealtimeSync(userId);
                }

                return result;
            } catch (error) {
                console.error('[SettingsBridge] Error creating personal knowledge base:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('settings:connect-external-knowledge-base', async () => {
            try {
                await databaseManager.initialize();
                await knowledgeBaseService.showExternalDialog();
                return { success: true };
            } catch (error) {
                console.error('[SettingsBridge] Error opening external database dialog:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('settings:sync-knowledge-base', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                await firebaseKnowledgeSync.initialize();
                return await firebaseKnowledgeSync.syncToFirebase(userId);
            } catch (error) {
                console.error('[SettingsBridge] Error syncing knowledge base:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('settings:open-knowledge-base-manager', async () => {
            try {
                await knowledgeBaseService.showKnowledgeBase();
                return { success: true };
            } catch (error) {
                console.error('[SettingsBridge] Error opening knowledge base manager:', error);
                return { success: false, error: error.message };
            }
        });

        // Knowledge Base Window Management
        ipcMain.handle('knowledge-base:close-window', async () => {
            try {
                knowledgeBaseService.closeKnowledgeBase();
                return { success: true };
            } catch (error) {
                console.error('[SettingsBridge] Error closing knowledge base window:', error);
                return { success: false, error: error.message };
            }
        });

        // NOTE: External Database Connection handlers moved to knowledgeBridge.js
        // to avoid duplicate IPC handler registration errors

        console.log('[SettingsBridge] Initialized');
    }
};
