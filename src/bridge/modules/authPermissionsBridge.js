/**
 * Auth & Permissions Bridge - IPC handlers for authentication and system permissions
 */
const { ipcMain, app } = require('electron');
const authService = require('../../features/common/services/authService');
const permissionService = require('../../features/common/services/permissionService');
const encryptionService = require('../../features/common/services/encryptionService');

module.exports = {
    initialize() {
        // Permissions
        ipcMain.handle('check-system-permissions', async () => await permissionService.checkSystemPermissions());
        ipcMain.handle('request-microphone-permission', async () => await permissionService.requestMicrophonePermission());
        ipcMain.handle('open-system-preferences', async (event, section) => await permissionService.openSystemPreferences(section));
        ipcMain.handle('mark-keychain-completed', async () => await permissionService.markKeychainCompleted());
        ipcMain.handle('check-keychain-completed', async (event, uid) => await permissionService.checkKeychainCompleted(uid));
        ipcMain.handle('initialize-encryption-key', async () => {
            const userId = authService.getCurrentUserId();
            await encryptionService.initializeKey(userId);
            return { success: true };
        });

        // User/Auth
        ipcMain.handle('get-current-user', () => authService.getCurrentUser());
        ipcMain.handle('start-firebase-auth', async () => await authService.startFirebaseAuthFlow());
        ipcMain.handle('firebase-logout', async () => await authService.signOut());

        // App
        ipcMain.handle('quit-application', () => app.quit());

        console.log('[AuthPermissionsBridge] Initialized');
    }
};
